alter table public.lesson_progress
  add constraint lesson_progress_seconds_range check (seconds between 0 and 86400);
