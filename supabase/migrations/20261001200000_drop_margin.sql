-- The margin of error is gone from the product: the scoring result carries bands only.

create or replace function public.save_scored_script(p_task_type text, p_prompt text, p_text text, p_result jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  sid uuid;
begin
  insert into public.scripts (task_type, prompt, text, overall_band, calibration_version, result)
  values (
    p_task_type, p_prompt, p_text,
    (p_result -> 'overall' ->> 'band')::numeric,
    p_result ->> 'calibration_version', p_result
  )
  returning id into sid;
  insert into public.criterion_bands (script_id, criterion, band)
  select sid, c.key, (c.value ->> 'band')::smallint
  from jsonb_each(p_result -> 'criteria') as c;
  return sid;
end $$;

alter table public.scripts drop column overall_margin;
alter table public.criterion_bands drop column margin;
