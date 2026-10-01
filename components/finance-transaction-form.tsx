"use client";

import { useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import { createFinanceTransaction } from "@/lib/actions/finance";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Source = { id: string; name: string };
type Category = {
  id: string;
  name: string;
  transaction_type: "income" | "expense";
  scope: "business" | "private" | null;
};

type TransactionDefaults = {
  transaction_type: "income" | "expense";
  scope: "business" | "private";
  amount: string | number;
  occurred_on: string;
  description: string;
  category_id?: string | null;
  source_id?: string | null;
  recurring?: boolean;
  notes?: string | null;
};

function FinanceFields({
  sources,
  categories,
  defaultDate,
  defaults,
}: {
  sources: Source[];
  categories: Category[];
  defaultDate: string;
  defaults?: TransactionDefaults;
}) {
  const [type, setType] = useState<"income"|"expense">(defaults?.transaction_type || "expense");
  const [scope, setScope] = useState<"business"|"private">(defaults?.scope || "business");

  const filteredCategories = useMemo(
    () => categories.filter(category =>
      category.transaction_type === type &&
      (!category.scope || category.scope === scope)
    ),
    [categories, type, scope]
  );

  return <>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ</label>
      <Select name="transaction_type" value={type} onChange={event => setType(event.target.value as "income"|"expense")}>
        <option value="expense">Koszt</option>
        <option value="income">Przychód</option>
      </Select>
    </div>

    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Obszar</label>
      <Select name="scope" value={scope} onChange={event => setScope(event.target.value as "business"|"private")}>
        <option value="business">Firmowe</option>
        <option value="private">Prywatne</option>
      </Select>
    </div>

    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Kwota</label>
      <Input name="amount" inputMode="decimal" required placeholder="0,00" defaultValue={defaults?.amount ?? ""}/>
    </div>

    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label>
      <Input name="occurred_on" type="date" required defaultValue={defaults?.occurred_on || defaultDate}/>
    </div>

    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label>
      <Input name="description" required defaultValue={defaults?.description || ""} placeholder={type === "income" ? "Np. prowizja / faktura / wynagrodzenie" : "Np. Vercel / reklamy / paliwo"}/>
    </div>

    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Kategoria</label>
      <Select name="category_id" defaultValue={defaults?.category_id || ""} key={`${type}:${scope}:${defaults?.category_id || ""}`}>
        <option value="">— bez kategorii —</option>
        {filteredCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </Select>
    </div>

    {type === "income" ? <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Źródło przychodu</label>
      <Select name="source_id" defaultValue={defaults?.source_id || ""}>
        <option value="">— bez źródła —</option>
        {sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
      </Select>
    </div> : <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Powtarzalny koszt</label>
      <label className="flex h-10 items-center gap-2 rounded-xl border border-[#dbe3ec] bg-white px-3 text-sm text-[#536674]">
        <input type="checkbox" name="recurring" defaultChecked={Boolean(defaults?.recurring)} className="h-4 w-4 rounded"/>
        Stały / cykliczny
      </label>
    </div>}

    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatka</label>
      <Textarea name="notes" rows={3} defaultValue={defaults?.notes || ""} placeholder="Opcjonalnie"/>
    </div>
  </>;
}

export function FinanceTransactionForm({
  sources,
  categories,
  defaultDate,
}: {
  sources: Source[];
  categories: Category[];
  defaultDate: string;
}) {
  return <ActionForm
    action={createFinanceTransaction}
    successMessage="Transakcja dodana"
    resetOnSuccess
    className="grid gap-4 md:grid-cols-2"
  >
    <FinanceFields sources={sources} categories={categories} defaultDate={defaultDate}/>
    <div className="md:col-span-2 flex justify-end">
      <Button type="submit"><Plus size={15}/> Dodaj transakcję</Button>
    </div>
  </ActionForm>;
}

export function FinanceTransactionEditForm({
  action,
  sources,
  categories,
  defaultDate,
  defaults,
}: {
  action: (formData: FormData) => Promise<void | { ok?: boolean; message?: string; description?: string }>;
  sources: Source[];
  categories: Category[];
  defaultDate: string;
  defaults: TransactionDefaults;
}) {
  return <ActionForm
    action={action}
    successMessage="Transakcja zaktualizowana"
    className="grid gap-4 md:grid-cols-2"
  >
    <FinanceFields sources={sources} categories={categories} defaultDate={defaultDate} defaults={defaults}/>
    <div className="md:col-span-2 flex justify-end">
      <Button type="submit"><Save size={15}/> Zapisz zmiany</Button>
    </div>
  </ActionForm>;
}
