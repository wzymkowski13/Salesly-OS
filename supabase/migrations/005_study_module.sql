-- Salesly OS v1 / Study module

do $block$
begin
  create type public.study_class_type as enum ('lecture', 'exercise', 'lab', 'seminar', 'other');
exception
  when duplicate_object then null;
end
$block$;

do $block$
begin
  create type public.study_attendance_status as enum ('unknown', 'present', 'absent', 'cancelled');
exception
  when duplicate_object then null;
end
$block$;

create table if not exists public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  semester text,
  lecturer text,
  ects numeric(4,1) not null default 0 check (ects >= 0),
  pass_type text,
  pass_date date,
  pass_condition text,
  final_grade numeric(3,2) check (final_grade is null or (final_grade >= 1 and final_grade <= 6)),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_subjects_user_idx on public.study_subjects(user_id);
create index if not exists study_subjects_pass_date_idx on public.study_subjects(user_id, pass_date) where pass_date is not null;

create table if not exists public.study_classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  class_type public.study_class_type not null default 'lecture',
  title text,
  lecturer text,
  room text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  attendance_status public.study_attendance_status not null default 'unknown',
  notes text,
  source text not null default 'manual',
  external_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_classes_user_start_idx on public.study_classes(user_id, starts_at);
create index if not exists study_classes_subject_idx on public.study_classes(subject_id, starts_at);
create unique index if not exists study_classes_external_unique
  on public.study_classes(user_id, source, external_event_id)
  where external_event_id is not null;

create table if not exists public.study_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  label text not null,
  grade numeric(3,2) not null check (grade >= 1 and grade <= 6),
  weight numeric(5,2) not null default 0 check (weight >= 0 and weight <= 100),
  graded_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_grades_subject_idx on public.study_grades(subject_id, graded_at);

drop trigger if exists study_subjects_updated on public.study_subjects;
create trigger study_subjects_updated
before update on public.study_subjects
for each row execute function public.set_updated_at();

drop trigger if exists study_classes_updated on public.study_classes;
create trigger study_classes_updated
before update on public.study_classes
for each row execute function public.set_updated_at();

drop trigger if exists study_grades_updated on public.study_grades;
create trigger study_grades_updated
before update on public.study_grades
for each row execute function public.set_updated_at();

alter table public.study_subjects enable row level security;
alter table public.study_classes enable row level security;
alter table public.study_grades enable row level security;

drop policy if exists study_subjects_own on public.study_subjects;
create policy study_subjects_own
on public.study_subjects
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

drop policy if exists study_classes_own on public.study_classes;
create policy study_classes_own
on public.study_classes
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

drop policy if exists study_grades_own on public.study_grades;
create policy study_grades_own
on public.study_grades
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

drop trigger if exists audit_study_subjects on public.study_subjects;
create trigger audit_study_subjects
after insert or update or delete on public.study_subjects
for each row execute function public.write_audit_log();

drop trigger if exists audit_study_classes on public.study_classes;
create trigger audit_study_classes
after insert or update or delete on public.study_classes
for each row execute function public.write_audit_log();

drop trigger if exists audit_study_grades on public.study_grades;
create trigger audit_study_grades
after insert or update or delete on public.study_grades
for each row execute function public.write_audit_log();

create or replace view public.study_subject_summary
with (security_invoker = true)
as
select
  s.*,
  coalesce(att.present_count, 0) as present_count,
  coalesce(att.absent_count, 0) as absent_count,
  coalesce(att.cancelled_count, 0) as cancelled_count,
  case
    when coalesce(att.present_count, 0) + coalesce(att.absent_count, 0) = 0 then null
    else round(
      100.0 * coalesce(att.present_count, 0)
      / (coalesce(att.present_count, 0) + coalesce(att.absent_count, 0)),
      1
    )
  end as attendance_pct,
  grades.weighted_average,
  coalesce(grades.weight_total, 0) as weight_total
from public.study_subjects s
left join lateral (
  select
    count(*) filter (where c.attendance_status = 'present') as present_count,
    count(*) filter (where c.attendance_status = 'absent') as absent_count,
    count(*) filter (where c.attendance_status = 'cancelled') as cancelled_count
  from public.study_classes c
  where c.subject_id = s.id
) att on true
left join lateral (
  select
    case
      when sum(g.weight) filter (where g.weight > 0) is null then null
      else round(
        sum(g.grade * g.weight) filter (where g.weight > 0)
        / nullif(sum(g.weight) filter (where g.weight > 0), 0),
        2
      )
    end as weighted_average,
    coalesce(sum(g.weight), 0) as weight_total
  from public.study_grades g
  where g.subject_id = s.id
) grades on true;

revoke all on public.study_subject_summary from anon;
grant select on public.study_subject_summary to authenticated;
