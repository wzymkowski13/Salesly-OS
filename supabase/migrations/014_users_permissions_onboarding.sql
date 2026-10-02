-- Salesly OS / Users + permissions + onboarding

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists preferred_workspace text
    check (preferred_workspace is null or preferred_workspace in ('work','private'));

create table if not exists public.access_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  permission_keys text[] not null default '{}',
  invited_by uuid references public.profiles(id) on delete set null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists access_invitations_email_unique
  on public.access_invitations(lower(email))
  where revoked_at is null;

create index if not exists access_invitations_created_idx
  on public.access_invitations(created_at desc);

alter table public.access_invitations enable row level security;

-- Support exact permissions, namespace wildcards (private.*, work.*, leadfactory.*)
-- and the global admin permission.
create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid()
      and (
        up.permission_key = permission_name
        or up.permission_key = '*'
        or up.permission_key = 'admin.permissions'
        or (
          right(up.permission_key, 2) = '.*'
          and permission_name like left(up.permission_key, length(up.permission_key) - 1) || '%'
        )
      )
  );
$function$;

revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

drop policy if exists access_invitations_admin on public.access_invitations;
create policy access_invitations_admin
on public.access_invitations
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('admin.permissions')
)
with check (
  public.is_active_app_user()
  and public.has_permission('admin.permissions')
);

-- Existing users predate onboarding and permission enforcement.
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at),
    preferred_workspace = coalesce(preferred_workspace, 'private')
where is_active = true;

-- Preserve today's behavior for existing active users.
with permission_keys(permission_key) as (
  values
    ('work.dashboard'),
    ('work.crm'),
    ('work.renewals'),
    ('work.tasks'),
    ('work.calendar'),
    ('work.notifications'),
    ('leadfactory.access'),
    ('private.dashboard'),
    ('private.tasks'),
    ('private.calendar'),
    ('private.study'),
    ('private.finance'),
    ('private.documents'),
    ('settings.integrations'),
    ('external.callcenter'),
    ('external.salesmetrics')
)
insert into public.user_permissions (user_id, permission_key, granted_by)
select p.id, pk.permission_key, p.id
from public.profiles p
cross join permission_keys pk
where p.is_active = true
on conflict (user_id, permission_key) do nothing;

-- The oldest active profile becomes the first permissions administrator.
with first_admin as (
  select id
  from public.profiles
  where is_active = true
  order by created_at asc
  limit 1
)
insert into public.user_permissions (user_id, permission_key, granted_by)
select id, 'admin.permissions', id
from first_admin
on conflict (user_id, permission_key) do nothing;
