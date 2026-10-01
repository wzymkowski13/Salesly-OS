-- Salesly OS / Finance tax profile + estimation v1.2

create table if not exists public.finance_tax_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tax_method text not null default 'profit_rate'
    check (tax_method in ('profit_rate','revenue_rate','custom')),
  tax_rate numeric(6,3) not null default 12
    check (tax_rate >= 0 and tax_rate <= 100),
  social_zus_monthly numeric(12,2) not null default 0
    check (social_zus_monthly >= 0),
  health_contribution_monthly numeric(12,2) not null default 0
    check (health_contribution_monthly >= 0),
  vat_payer boolean not null default false,
  vat_rate numeric(6,3) not null default 23
    check (vat_rate >= 0 and vat_rate <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists finance_tax_profiles_updated on public.finance_tax_profiles;
create trigger finance_tax_profiles_updated
before update on public.finance_tax_profiles
for each row execute function public.set_updated_at();

alter table public.finance_tax_profiles enable row level security;

drop policy if exists finance_tax_profiles_own on public.finance_tax_profiles;
create policy finance_tax_profiles_own
on public.finance_tax_profiles
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());
