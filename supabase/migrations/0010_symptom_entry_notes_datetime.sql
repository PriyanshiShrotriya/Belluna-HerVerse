alter table public.symptom_entries
  add column recorded_at timestamptz,
  add column note text check (note is null or char_length(note) <= 500);

update public.symptom_entries
set recorded_at = log_date::timestamp at time zone 'UTC';

alter table public.symptom_entries
  alter column recorded_at set default now(),
  alter column recorded_at set not null,
  drop constraint symptom_entries_user_id_log_date_symptom_code_key,
  add constraint symptom_entries_user_symptom_recorded_at_key
    unique (user_id, symptom_code, recorded_at);

create index symptom_entries_user_recorded_at_idx
  on public.symptom_entries (user_id, recorded_at desc);
