create extension if not exists pgcrypto;

create type public.client_kind as enum ('company', 'person');
create type public.client_status as enum ('prospect', 'active', 'inactive');
create type public.policy_category as enum ('group_life', 'individual_life', 'property', 'open_group', 'other');
create type public.task_status as enum ('todo', 'in_progress', 'waiting', 'done');
create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.event_type as enum ('meeting', 'call', 'follow_up', 'private', 'other');
create type public.activity_type as enum ('note', 'call', 'meeting', 'email', 'system');
create type public.notification_type as enum ('task', 'renewal', 'anniversary', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  kind public.client_kind not null default 'company',
  status public.client_status not null default 'active',
  name text not null,
  nip text,
  phone text,
  email text,
  address text,
  city text,
  postal_code text,
  owner_id uuid references public.profiles(id) on delete set null,
  tags text[] not null default '{}',
  notes text,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index clients_nip_unique on public.clients(nip) where nip is not null and archived_at is null;
create index clients_owner_idx on public.clients(owner_id);
create index clients_status_idx on public.clients(status) where archived_at is null;
create index clients_name_idx on public.clients using btree(name);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  role text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_client_idx on public.contacts(client_id);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  category public.policy_category not null,
  insurer text not null default 'PZU',
  policy_number text,
  product_name text,
  premium numeric(12,2),
  member_count integer,
  start_date date,
  end_date date,
  renewal_date date,
  annual_review boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index policies_client_idx on public.policies(client_id);
create index policies_renewal_idx on public.policies(renewal_date) where renewal_date is not null;
create index policies_start_idx on public.policies(start_date) where start_date is not null;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'normal',
  assigned_to uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  due_date date,
  due_time time,
  reminder_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks(assigned_to);
create index tasks_due_idx on public.tasks(due_date) where status <> 'done';
create index tasks_client_idx on public.tasks(client_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type public.event_type not null default 'other',
  client_id uuid references public.clients(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  google_event_id text,
  google_calendar_id text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_starts_idx on public.events(starts_at);
create index events_client_idx on public.events(client_id);
create unique index events_google_unique on public.events(google_calendar_id, google_event_id) where google_event_id is not null;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  activity_type public.activity_type not null default 'note',
  title text not null,
  content text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index activities_client_idx on public.activities(client_id, occurred_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type public.notification_type not null,
  title text not null,
  body text,
  href text,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  snapshot jsonb,
  created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();
create trigger contacts_updated before update on public.contacts for each row execute function public.set_updated_at();
create trigger policies_updated before update on public.policies for each row execute function public.set_updated_at();
create trigger tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create trigger events_updated before update on public.events for each row execute function public.set_updated_at();

create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  );
$$;

revoke all on function public.is_active_app_user() from public;
grant execute on function public.is_active_app_user() to authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.policies enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.activities enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (public.is_active_app_user());
create policy clients_all on public.clients for all to authenticated using (public.is_active_app_user()) with check (public.is_active_app_user());
create policy contacts_all on public.contacts for all to authenticated using (public.is_active_app_user()) with check (public.is_active_app_user());
create policy policies_all on public.policies for all to authenticated using (public.is_active_app_user()) with check (public.is_active_app_user());
create policy tasks_all on public.tasks for all to authenticated using (public.is_active_app_user()) with check (public.is_active_app_user());
create policy events_all on public.events for all to authenticated using (public.is_active_app_user()) with check (public.is_active_app_user());
create policy activities_all on public.activities for all to authenticated using (public.is_active_app_user()) with check (public.is_active_app_user());
create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid() and public.is_active_app_user());
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid() and public.is_active_app_user()) with check (user_id = auth.uid());
create policy audit_read on public.audit_logs for select to authenticated using (public.is_active_app_user());

create or replace view public.renewal_queue with (security_invoker = true) as
select
  p.id as policy_id,
  p.client_id,
  c.name as client_name,
  p.category,
  p.insurer,
  p.product_name,
  p.policy_number,
  p.renewal_date,
  (p.renewal_date - current_date) as days_left,
  c.owner_id
from public.policies p
join public.clients c on c.id = p.client_id
where p.renewal_date is not null
  and c.archived_at is null;

create or replace view public.anniversary_queue with (security_invoker = true) as
with base as (
  select
    p.id as policy_id,
    p.client_id,
    c.name as client_name,
    p.category,
    p.insurer,
    p.product_name,
    p.start_date,
    c.owner_id,
    (date_trunc('year', current_date)::date
      + (extract(month from p.start_date)::int - 1) * interval '1 month'
      + (extract(day from p.start_date)::int - 1) * interval '1 day')::date as this_year
  from public.policies p
  join public.clients c on c.id = p.client_id
  where p.start_date is not null and p.annual_review = true and c.archived_at is null
)
select *,
  case when this_year >= current_date then this_year else (this_year + interval '1 year')::date end as anniversary_date,
  (case when this_year >= current_date then this_year else (this_year + interval '1 year')::date end - current_date) as days_left
from base;

revoke all on public.renewal_queue from anon;
revoke all on public.anniversary_queue from anon;
grant select on public.renewal_queue to authenticated;
grant select on public.anniversary_queue to authenticated;
