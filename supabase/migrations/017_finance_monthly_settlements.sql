-- Salesly OS / Finance monthly confirmed results

create table if not exists public.finance_monthly_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_month date not null,
  actual_income_tax numeric(14,2) not null default 0 check (actual_income_tax >= 0),
  actual_social_zus numeric(14,2) not null default 0 check (actual_social_zus >= 0),
  actual_health_contribution numeric(14,2) not null default 0 check (actual_health_contribution >= 0),
  actual_vat numeric(14,2) not null default 0 check (actual_vat >= 0),
  other_public_charges numeric(14,2) not null default 0 check (other_public_charges >= 0),
  unrecorded_costs numeric(14,2) not null default 0 check (unrecorded_costs >= 0),
  unrecorded_income numeric(14,2) not null default 0 check (unrecorded_income >= 0),
  notes text,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, period_month),
  check (date_trunc('month', period_month)::date = period_month)
);

create index if not exists finance_monthly_settlements_user_month_idx
  on public.finance_monthly_settlements(user_id, period_month desc);

drop trigger if exists finance_monthly_settlements_updated on public.finance_monthly_settlements;
create trigger finance_monthly_settlements_updated
before update on public.finance_monthly_settlements
for each row execute function public.set_updated_at();

alter table public.finance_monthly_settlements enable row level security;

drop policy if exists finance_monthly_settlements_access on public.finance_monthly_settlements;
create policy finance_monthly_settlements_access
on public.finance_monthly_settlements
for all
to authenticated
using (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
)
with check (
  public.is_active_app_user()
  and public.has_permission('private.finance')
  and user_id = auth.uid()
);
