create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  category public.policy_category not null default 'other',
  stage text not null default 'new' check (stage in ('new','contact','meeting','offer','decision','won','lost')),
  estimated_value numeric(12,2),
  probability integer check (probability is null or (probability between 0 and 100)),
  next_step text,
  expected_close_date date,
  owner_id uuid references public.profiles(id) on delete set null,
  source text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_stage_idx on public.opportunities(stage);
create index opportunities_client_idx on public.opportunities(client_id);
create index opportunities_owner_idx on public.opportunities(owner_id);
create index opportunities_close_idx on public.opportunities(expected_close_date) where expected_close_date is not null;

create trigger opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();

alter table public.opportunities enable row level security;
create policy opportunities_all on public.opportunities for all to authenticated using (public.is_active_app_user()) with check (public.is_active_app_user());
