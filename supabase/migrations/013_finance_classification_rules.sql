-- Salesly OS / Finance classification rules v1.3

create table if not exists public.finance_classification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  priority integer not null default 100 check (priority >= 0 and priority <= 10000),
  match_field text not null default 'description'
    check (match_field in ('description')),
  match_operator text not null default 'contains'
    check (match_operator in ('contains','starts_with','exact')),
  match_value text not null,
  applies_to_type public.finance_transaction_type,
  set_scope public.finance_scope,
  set_category_id uuid references public.finance_categories(id) on delete set null,
  set_source_id uuid references public.finance_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(match_value)) >= 2),
  check (
    set_scope is not null
    or set_category_id is not null
    or set_source_id is not null
  )
);

create index if not exists finance_classification_rules_user_priority_idx
  on public.finance_classification_rules(user_id, active, priority, created_at);

drop trigger if exists finance_classification_rules_updated on public.finance_classification_rules;
create trigger finance_classification_rules_updated
before update on public.finance_classification_rules
for each row execute function public.set_updated_at();

alter table public.finance_classification_rules enable row level security;

drop policy if exists finance_classification_rules_own on public.finance_classification_rules;
create policy finance_classification_rules_own
on public.finance_classification_rules
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

alter table public.finance_transactions
  add column if not exists classification_rule_id uuid
    references public.finance_classification_rules(id) on delete set null;

create index if not exists finance_transactions_classification_rule_idx
  on public.finance_transactions(classification_rule_id)
  where classification_rule_id is not null;
