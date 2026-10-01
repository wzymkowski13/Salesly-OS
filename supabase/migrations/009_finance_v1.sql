-- Salesly OS / Finance v1 foundation

do $block$
begin
  create type public.finance_transaction_type as enum ('income', 'expense');
exception
  when duplicate_object then null;
end
$block$;

do $block$
begin
  create type public.finance_scope as enum ('business', 'private');
exception
  when duplicate_object then null;
end
$block$;

create table if not exists public.finance_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  transaction_type public.finance_transaction_type not null,
  scope public.finance_scope,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, name, transaction_type, scope)
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_type public.finance_transaction_type not null,
  scope public.finance_scope not null,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null,
  description text not null,
  category_id uuid references public.finance_categories(id) on delete set null,
  source_id uuid references public.finance_sources(id) on delete set null,
  recurring boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_transactions_user_date_idx
  on public.finance_transactions(user_id, occurred_on desc);

create index if not exists finance_transactions_user_type_idx
  on public.finance_transactions(user_id, transaction_type, occurred_on desc);

create index if not exists finance_transactions_user_scope_idx
  on public.finance_transactions(user_id, scope, occurred_on desc);

drop trigger if exists finance_transactions_updated on public.finance_transactions;
create trigger finance_transactions_updated
before update on public.finance_transactions
for each row execute function public.set_updated_at();

alter table public.finance_sources enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;

drop policy if exists finance_sources_own on public.finance_sources;
create policy finance_sources_own
on public.finance_sources
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

drop policy if exists finance_categories_own on public.finance_categories;
create policy finance_categories_own
on public.finance_categories
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

drop policy if exists finance_transactions_own on public.finance_transactions;
create policy finance_transactions_own
on public.finance_transactions
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());

-- Seed useful defaults for every existing user. ON CONFLICT keeps this rerunnable.
insert into public.finance_sources (user_id, name)
select p.id, source_name
from public.profiles p
cross join unnest(array['Salesly','Ubezpieczenia','Wynagrodzenie','Inne']) as source_name
on conflict (user_id, name) do nothing;

insert into public.finance_categories (user_id, name, transaction_type, scope)
select p.id, v.name, v.transaction_type::public.finance_transaction_type, v.scope::public.finance_scope
from public.profiles p
cross join (values
  ('Sprzedaż / usługi','income','business'),
  ('Ubezpieczenia','income','business'),
  ('Wynagrodzenie','income','private'),
  ('Inne przychody','income','private'),
  ('Wynagrodzenia','expense','business'),
  ('Software','expense','business'),
  ('Marketing','expense','business'),
  ('Księgowość','expense','business'),
  ('ZUS','expense','business'),
  ('Podatki','expense','business'),
  ('Telefon / Internet','expense','business'),
  ('Podróże','expense','business'),
  ('Inne firmowe','expense','business'),
  ('Mieszkanie','expense','private'),
  ('Jedzenie','expense','private'),
  ('Transport','expense','private'),
  ('Subskrypcje','expense','private'),
  ('Zdrowie','expense','private'),
  ('Rozrywka','expense','private'),
  ('Inne prywatne','expense','private')
) as v(name, transaction_type, scope)
on conflict (user_id, name, transaction_type, scope) do nothing;

drop trigger if exists audit_finance_transactions on public.finance_transactions;
create trigger audit_finance_transactions
after insert or update or delete on public.finance_transactions
for each row execute function public.write_audit_log();
