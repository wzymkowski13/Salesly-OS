-- Salesly OS v1 / Google study integrations

create table if not exists public.google_integrations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_email text,
  calendar_id text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists google_integrations_updated on public.google_integrations;
create trigger google_integrations_updated
before update on public.google_integrations
for each row execute function public.set_updated_at();

-- Tokens are intentionally server-only. No authenticated RLS policy is created.
alter table public.google_integrations enable row level security;

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  class_id uuid references public.study_classes(id) on delete cascade,
  title text not null,
  google_file_id text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique(user_id, google_file_id)
);

create index if not exists study_notes_subject_idx
  on public.study_notes(subject_id, created_at desc);

create index if not exists study_notes_class_idx
  on public.study_notes(class_id, created_at desc)
  where class_id is not null;

alter table public.study_notes enable row level security;

drop policy if exists study_notes_own on public.study_notes;
create policy study_notes_own
on public.study_notes
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

-- A non-partial unique index makes Google/ICS imports safely idempotent.
create unique index if not exists study_classes_external_idempotency_idx
  on public.study_classes(user_id, source, external_event_id);
