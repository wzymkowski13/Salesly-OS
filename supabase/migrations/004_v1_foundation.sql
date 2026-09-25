-- Salesly OS v1 foundation: scopes + granular permissions

do $$ begin
  create type public.workspace_scope as enum ('work', 'private', 'study', 'leadfactory');
exception when duplicate_object then null;
end $$;

alter table public.tasks
  add column if not exists scope public.workspace_scope not null default 'work';

alter table public.events
  add column if not exists scope public.workspace_scope not null default 'work';

create index if not exists tasks_scope_idx on public.tasks(scope);
create index if not exists events_scope_idx on public.events(scope);

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, permission_key)
);

create index if not exists user_permissions_user_idx on public.user_permissions(user_id);

alter table public.user_permissions enable row level security;

create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid()
      and up.permission_key = permission_name
  );
$;

revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

drop policy if exists user_permissions_read_self on public.user_permissions;
create policy user_permissions_read_self
on public.user_permissions
for select
to authenticated
using (
  public.is_active_app_user()
  and (user_id = auth.uid() or public.has_permission('admin.permissions'))
);

-- Existing data is explicitly classified as work data.
update public.tasks set scope = 'work' where scope is null;
update public.events set scope = 'work' where scope is null;
