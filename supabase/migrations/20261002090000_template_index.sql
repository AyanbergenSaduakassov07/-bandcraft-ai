-- Template index for the originality paths (apps/scoring-api pipeline/originality.py).
-- Gemini-generated templated Task 2 essays, split into passages, embedded with the Gemini
-- embeddings API (768 dims). Refreshed by the template-index workflow; service role only.

create extension if not exists vector with schema extensions;

create table public.template_essays (
  id text primary key,
  batch text not null,
  topic text not null,
  prompt text not null,
  text text not null,
  embedding extensions.vector(768) not null,
  generator_model text not null,
  embedding_model text not null,
  created_at timestamptz not null default now()
);

create table public.template_passages (
  essay_id text not null references public.template_essays on delete cascade,
  position smallint not null,
  passage text not null,
  embedding extensions.vector(768) not null,
  primary key (essay_id, position)
);
create index template_passages_embedding on public.template_passages
  using hnsw (embedding extensions.vector_cosine_ops);

-- RLS on with no policies: only the service role (scoring API, workflows) can read or write.
alter table public.template_essays enable row level security;
alter table public.template_passages enable row level security;

-- For each query vector (a JSON array of 768-float arrays), the closest template passage.
-- jsonb, not vector[], so PostgREST can pass it without array-literal quoting.
create function public.nearest_template_passages(queries jsonb)
returns table (query integer, essay_id text, topic text, passage text, similarity double precision)
language sql stable security invoker set search_path = '' as $$
  select (q.i - 1)::integer, t.essay_id, t.topic, t.passage, t.similarity
  from jsonb_array_elements(queries) with ordinality as q(v, i)
  cross join lateral (
    select p.essay_id, e.topic, p.passage,
           1 - (p.embedding operator(extensions.<=>) (q.v::text)::extensions.vector) as similarity
    from public.template_passages p
    join public.template_essays e on e.id = p.essay_id
    order by p.embedding operator(extensions.<=>) (q.v::text)::extensions.vector
    limit 1
  ) t;
$$;
revoke execute on function public.nearest_template_passages(jsonb) from public, anon, authenticated;
grant execute on function public.nearest_template_passages(jsonb) to service_role;

-- Every scored Script keeps its embedding, so the index can later be checked against real usage.
alter table public.scripts add column embedding extensions.vector(768);

drop function public.save_scored_script(text, text, text, jsonb);
create function public.save_scored_script(
  p_task_type text, p_prompt text, p_text text, p_result jsonb, p_embedding text default null
)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  sid uuid;
begin
  insert into public.scripts (task_type, prompt, text, overall_band, calibration_version, result, embedding)
  values (
    p_task_type, p_prompt, p_text,
    (p_result -> 'overall' ->> 'band')::numeric,
    p_result ->> 'calibration_version', p_result,
    p_embedding::extensions.vector
  )
  returning id into sid;
  insert into public.criterion_bands (script_id, criterion, band)
  select sid, c.key, (c.value ->> 'band')::smallint
  from jsonb_each(p_result -> 'criteria') as c;
  return sid;
end $$;
revoke execute on function public.save_scored_script(text, text, text, jsonb, text) from public, anon;
grant execute on function public.save_scored_script(text, text, text, jsonb, text) to authenticated;
