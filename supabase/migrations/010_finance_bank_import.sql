-- Salesly OS / Finance bank import v1.1

create table if not exists public.finance_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  source_label text,
  row_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.finance_transactions
  add column if not exists import_batch_id uuid references public.finance_import_batches(id) on delete set null,
  add column if not exists import_hash text,
  add column if not exists import_source text,
  add column if not exists raw_data jsonb;

create index if not exists finance_import_batches_user_idx
  on public.finance_import_batches(user_id, created_at desc);

create index if not exists finance_transactions_import_hash_idx
  on public.finance_transactions(user_id, import_hash)
  where import_hash is not null;

alter table public.finance_import_batches enable row level security;

drop policy if exists finance_import_batches_own on public.finance_import_batches;
create policy finance_import_batches_own
on public.finance_import_batches
for all
to authenticated
using (public.is_active_app_user() and user_id = auth.uid())
with check (public.is_active_app_user() and user_id = auth.uid());
