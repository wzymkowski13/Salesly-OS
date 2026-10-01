-- Salesly OS / Finance health contribution as percentage of income

alter table public.finance_tax_profiles
  add column if not exists health_contribution_rate numeric(6,3) not null default 9
    check (health_contribution_rate >= 0 and health_contribution_rate <= 100);

-- Legacy column health_contribution_monthly is kept for backwards compatibility,
-- but Finance v1.3 no longer uses it in calculations.
update public.finance_tax_profiles
set health_contribution_rate = 9
where health_contribution_rate is null;
