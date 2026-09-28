-- Salesly OS / Study UX v2
-- Link individual grades to a specific class block while keeping subject-level grades supported.

alter table public.study_grades
  add column if not exists class_id uuid references public.study_classes(id) on delete set null;

create index if not exists study_grades_class_idx
  on public.study_grades(class_id, created_at desc)
  where class_id is not null;
