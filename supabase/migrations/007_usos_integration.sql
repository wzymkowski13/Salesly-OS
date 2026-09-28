-- Salesly OS v1 / USOS integration (UJD + PCz)

alter type public.study_class_type add value if not exists 'workshop';

alter table public.study_subjects
  add column if not exists source text not null default 'manual',
  add column if not exists source_provider text,
  add column if not exists external_course_id text,
  add column if not exists external_term_id text,
  add column if not exists last_synced_at timestamptz;

create unique index if not exists study_subjects_external_unique
  on public.study_subjects(user_id, source_provider, external_course_id, external_term_id);

alter table public.study_classes
  add column if not exists building text,
  add column if not exists source_provider text,
  add column if not exists external_unit_id text,
  add column if not exists external_group_number text,
  add column if not exists external_meeting_id text,
  add column if not exists last_synced_at timestamptz;

create table if not exists public.usos_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('ujd', 'pcz')),
  access_token text not null,
  access_token_secret text not null,
  scopes text[] not null default '{}',
  external_user_id text,
  external_user_name text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists usos_connections_updated on public.usos_connections;
create trigger usos_connections_updated
before update on public.usos_connections
for each row execute function public.set_updated_at();

-- Access tokens are server-only. No authenticated RLS policy is created.
alter table public.usos_connections enable row level security;

create table if not exists public.usos_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('ujd', 'pcz')),
  status text not null default 'running',
  subjects_count integer not null default 0,
  classes_count integer not null default 0,
  updated_count integer not null default 0,
  cancelled_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists usos_sync_runs_user_idx
  on public.usos_sync_runs(user_id, started_at desc);

alter table public.usos_sync_runs enable row level security;

drop policy if exists usos_sync_runs_own on public.usos_sync_runs;
create policy usos_sync_runs_own
on public.usos_sync_runs
for select
to authenticated
using (public.is_active_app_user() and user_id = auth.uid());
