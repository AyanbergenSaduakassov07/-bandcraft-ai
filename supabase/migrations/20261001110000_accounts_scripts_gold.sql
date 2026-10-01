-- Accounts, scored Scripts and the Gold Set. Terms follow /CONTEXT.md.

create schema if not exists private;

-- ── Accounts: adults only ───────────────────────────────────────────────────
-- Gemini API Additional Terms of Service (https://ai.google.dev/gemini-api/terms), "Age Requirements":
--   "You must be 18 years of age or older to use the APIs." and API clients must not be
--   "directed towards or ... likely to be accessed by individuals under the age of 18."
-- So the gate lives here, not just in the signup form: every way of creating an auth user
-- (form, API call, a future OAuth button) goes through this trigger, and without an adult
-- birth_date in the signup metadata the user row is never created.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  birth_date date not null check (birth_date >= date '1900-01-01'),
  created_at timestamptz not null default now(),
  constraint adult_at_signup check (birth_date <= (created_at at time zone 'utc')::date - interval '18 years')
);
comment on table public.profiles is
  'One row per account, created only by private.handle_new_user. birth_date is the evidence for the 18+ gate (Gemini API terms); users can read it but never change it.';

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  dob date;
begin
  begin
    dob := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    dob := null;
  end;
  if dob is null or dob > current_date - interval '18 years' then
    raise exception 'BandCraft AI accounts are for people aged 18 and over'
      using errcode = 'check_violation';
  end if;
  insert into public.profiles (id, birth_date) values (new.id, dob);
  return new;
end $$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
-- No insert/update/delete policies: only the trigger writes, and nobody edits a birth date.

-- ── Scored Scripts and per-criterion history ────────────────────────────────

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  task_type text not null check (task_type in ('task1_academic', 'task1_general', 'task2')),
  prompt text not null check (length(prompt) between 1 and 4000),
  text text not null check (length(text) between 1 and 20000),
  overall_band numeric(2, 1) not null check (overall_band between 0 and 9 and overall_band * 2 = floor(overall_band * 2)),
  overall_margin numeric(2, 1) not null check (overall_margin >= 0),
  calibration_version text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
comment on table public.scripts is
  'A Script and its POST /score/final result. Every Overall Band is stored with its Margin of Error; result holds the full response so the annotated feedback can be shown again.';
comment on column public.scripts.result is 'The POST /score/final body (apps/scoring-api schemas.FinalResponse).';
create index scripts_user_created on public.scripts (user_id, created_at desc);

create table public.criterion_bands (
  script_id uuid not null references public.scripts on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  criterion text not null check (criterion in ('task_achievement_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy')),
  band smallint not null check (band between 0 and 9),
  margin numeric(2, 1) not null check (margin >= 0),
  primary key (script_id, criterion)
);
create index criterion_bands_user on public.criterion_bands (user_id);

alter table public.scripts enable row level security;
alter table public.criterion_bands enable row level security;
create policy "read own scripts" on public.scripts for select to authenticated using (user_id = (select auth.uid()));
create policy "add own scripts" on public.scripts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "read own criterion bands" on public.criterion_bands for select to authenticated using (user_id = (select auth.uid()));
create policy "add own criterion bands" on public.criterion_bands for insert to authenticated with check (user_id = (select auth.uid()));

-- One call saves the Script and its four Criterion Bands atomically, taking every number from the
-- scoring result so the columns can't drift from it. Runs as the caller, so RLS still applies.
-- ponytail: a user could save a fabricated result to their own history. It only misleads them; move the
-- write to the service role if history is ever shown to anyone else (tutors, leaderboards).
create function public.save_scored_script(p_task_type text, p_prompt text, p_text text, p_result jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  sid uuid;
begin
  insert into public.scripts (task_type, prompt, text, overall_band, overall_margin, calibration_version, result)
  values (
    p_task_type, p_prompt, p_text,
    (p_result -> 'overall' ->> 'band')::numeric, (p_result -> 'overall' ->> 'margin')::numeric,
    p_result ->> 'calibration_version', p_result
  )
  returning id into sid;
  insert into public.criterion_bands (script_id, criterion, band, margin)
  select sid, c.key, (c.value ->> 'band')::smallint, (c.value ->> 'margin')::numeric
  from jsonb_each(p_result -> 'criteria') as c;
  return sid;
end $$;
revoke execute on function public.save_scored_script(text, text, text, jsonb) from public, anon;
grant execute on function public.save_scored_script(text, text, text, jsonb) to authenticated;

-- ── Gold Set and Calibration (service role only) ────────────────────────────

create table public.gold_scripts (
  id text primary key,
  task_type text not null check (task_type in ('task1_academic', 'task1_general', 'task2')),
  prompt text not null,
  text text not null,
  overall_band numeric(2, 1) not null check (overall_band between 0 and 9),
  criteria jsonb not null,
  provenance_kind text not null check (provenance_kind in ('author_synthetic', 'examiner')),
  provenance text not null,
  added_at timestamptz not null default now()
);
comment on table public.gold_scripts is
  'The Gold Set. author_synthetic labels are the author''s estimates, not examiner scores; report accuracy separately by provenance_kind. Mirrors apps/scoring-api/tests/fixtures/gold, which stays the source the calibrate workflow reads.';

create table public.calibrations (
  version text primary key,
  calibrator text not null check (calibrator in ('isotonic', 'linear')),
  gold_count int not null check (gold_count > 0),
  bundle jsonb not null,
  report text not null,
  created_at timestamptz not null default now()
);
comment on table public.calibrations is 'Fitted stage 4-5 bundles (bundle.json) and their leave-one-out benchmark report, one row per calibrate run.';

alter table public.gold_scripts enable row level security;
alter table public.calibrations enable row level security;
-- No policies: only the service role (training, admin) reads or writes these.
