import Link from "next/link";
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { pl } from "date-fns/locale";
import { Building2, ChevronLeft, ChevronRight, CircleDollarSign, Pencil, Plus, ReceiptText, Settings2, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInWarsaw } from "@/lib/date";
import { createFinanceCategory, createFinanceSource, deleteFinanceTransaction, updateFinanceTransaction } from "@/lib/actions/finance";
import { FinanceTransactionEditForm, FinanceTransactionForm } from "@/components/finance-transaction-form";
import { SectionHeader } from "@/components/section-header";
import { FormDisclosure } from "@/components/form-disclosure";
import { ActionForm } from "@/components/action-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";

function money(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(value);
}

function monthLabel(value: Date) {
  return format(value, "LLLL yyyy", { locale: pl });
}

function aggregate(rows: any[], key: (row: any) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = key(row) || "Bez kategorii";
    map.set(label, (map.get(label) || 0) + Number(row.amount || 0));
  }
  return [...map.entries()].sort((a,b) => b[1] - a[1]);
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const defaultMonth = todayInWarsaw().slice(0, 7);
  const requestedMonth = /^\d{4}-\d{2}$/.test(params.month || "") ? params.month! : defaultMonth;
  const focus = parseISO(`${requestedMonth}-01`);
  const from = format(startOfMonth(focus), "yyyy-MM-dd");
  const to = format(endOfMonth(focus), "yyyy-MM-dd");
  const prev = format(addMonths(focus, -1), "yyyy-MM");
  const next = format(addMonths(focus, 1), "yyyy-MM");
  const supabase = await createClient();

  const [
    { data: transactions, error: transactionsError },
    { data: sources, error: sourcesError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("finance_transactions")
      .select("id,transaction_type,scope,amount,occurred_on,description,recurring,notes,category_id,source_id,created_at,finance_categories(name),finance_sources(name)")
      .eq("user_id", user.id)
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("finance_sources").select("id,name").eq("user_id", user.id).eq("active", true).order("name"),
    supabase.from("finance_categories").select("id,name,transaction_type,scope").eq("user_id", user.id).eq("active", true).order("name"),
  ]);

  if (transactionsError || sourcesError || categoriesError) {
    return <div className="space-y-6">
      <SectionHeader title="Finanse"/>
      <Card className="border-amber-200">
        <CardContent className="p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><WalletCards size={20}/></div>
          <h2 className="mt-4 text-lg font-bold text-[#2f404b]">Finanse v1 czekają na migrację 009</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71808b]">Kod jest już wdrożony, ale Supabase nie ma jeszcze tabel finansowych. Uruchom plik <strong>supabase/migrations/009_finance_v1.sql</strong> w SQL Editorze. Po migracji ten ekran automatycznie zmieni się w działający moduł finansowy.</p>
        </CardContent>
      </Card>
    </div>;
  }

  const rows = transactions || [];
  const incomeRows = rows.filter((row:any) => row.transaction_type === "income");
  const expenseRows = rows.filter((row:any) => row.transaction_type === "expense");
  const income = incomeRows.reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const expenses = expenseRows.reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const balance = income - expenses;
  const businessExpenses = expenseRows.filter((row:any) => row.scope === "business").reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const privateExpenses = expenseRows.filter((row:any) => row.scope === "private").reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);

  const incomeBreakdown = aggregate(incomeRows, row => row.finance_sources?.name || "Bez źródła");
  const expenseBreakdown = aggregate(expenseRows, row => row.finance_categories?.name || "Bez kategorii");
  const maxIncome = Math.max(1, ...incomeBreakdown.map(([,value]) => value));
  const maxExpense = Math.max(1, ...expenseBreakdown.map(([,value]) => value));

  const addForm = <FinanceTransactionForm
    sources={(sources || []) as any[]}
    categories={(categories || []) as any[]}
    defaultDate={todayInWarsaw()}
  />;

  const addSourceForm = <ActionForm
    action={createFinanceSource}
    successMessage="Źródło przychodu dodane"
    resetOnSuccess
    className="space-y-4"
  >
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa źródła</label>
      <Input name="name" required placeholder="Np. Salesly Performance"/>
    </div>
    <div className="flex justify-end"><Button type="submit"><Plus size={15}/> Dodaj źródło</Button></div>
  </ActionForm>;

  const addCategoryForm = <ActionForm
    action={createFinanceCategory}
    successMessage="Kategoria dodana"
    resetOnSuccess
    className="grid gap-4 md:grid-cols-2"
  >
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa kategorii</label>
      <Input name="name" required placeholder="Np. Hosting"/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ</label>
      <Select name="transaction_type" defaultValue="expense"><option value="expense">Koszt</option><option value="income">Przychód</option></Select>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Obszar</label>
      <Select name="scope" defaultValue="business"><option value="business">Firmowe</option><option value="private">Prywatne</option><option value="">Oba</option></Select>
    </div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit"><Plus size={15}/> Dodaj kategorię</Button></div>
  </ActionForm>;

  return <div className="space-y-6">
    <SectionHeader
      title="Finanse"
      action={<FormDisclosure label="Dodaj transakcję" align="right">{addForm}</FormDisclosure>}
    />

    <div className="flex flex-col gap-3 rounded-[18px] border border-[#dfe6ee] bg-white p-3 shadow-[0_1px_2px_rgba(28,44,60,.03)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1.5">
        <Link aria-label="Poprzedni miesiąc" href={`/private/finance?month=${prev}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ed] text-[#657580] transition hover:bg-[#f5f8fa]"><ChevronLeft size={17}/></Link>
        <Link href={`/private/finance?month=${defaultMonth}`} className="inline-flex h-9 items-center rounded-xl border border-[#e1e7ed] px-3 text-sm font-semibold text-[#485965] transition hover:bg-[#f5f8fa]">Bieżący miesiąc</Link>
        <Link aria-label="Następny miesiąc" href={`/private/finance?month=${next}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ed] text-[#657580] transition hover:bg-[#f5f8fa]"><ChevronRight size={17}/></Link>
      </div>
      <div className="text-base font-bold capitalize text-[#30404b] sm:text-lg">{monthLabel(focus)}</div>
      <div className="text-xs font-semibold text-[#8996a0]">{rows.length} transakcji</div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Przychody" value={money(income)} hint="w tym miesiącu" icon={TrendingUp} tone="green"/>
      <StatCard label="Koszty" value={money(expenses)} hint="w tym miesiącu" icon={TrendingDown} tone="amber"/>
      <StatCard label="Bilans" value={money(balance)} hint="przychody minus koszty" icon={CircleDollarSign} tone={balance >= 0 ? "blue" : "slate"}/>
      <StatCard label="Koszty firmowe" value={money(businessExpenses)} hint={`prywatne: ${money(privateExpenses)}`} icon={Building2} tone="slate"/>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><div><h2 className="font-bold text-[#2a3944]">Źródła przychodów</h2><div className="text-xs text-[#83909b]">struktura bieżącego miesiąca</div></div></CardHeader>
        <CardContent className="space-y-3">
          {incomeBreakdown.slice(0,6).map(([label,value]) => <div key={label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold text-[#536674]">{label}</span><span className="font-bold text-[#34444f]">{money(value)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(5,(value/maxIncome)*100)}%` }}/></div>
          </div>)}
          {!incomeBreakdown.length && <EmptyState title="Brak przychodów" description="Dodaj pierwszy przychód, aby zobaczyć strukturę źródeł."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><h2 className="font-bold text-[#2a3944]">Kategorie kosztów</h2><div className="text-xs text-[#83909b]">największe pozycje miesiąca</div></div></CardHeader>
        <CardContent className="space-y-3">
          {expenseBreakdown.slice(0,6).map(([label,value]) => <div key={label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold text-[#536674]">{label}</span><span className="font-bold text-[#34444f]">{money(value)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(5,(value/maxExpense)*100)}%` }}/></div>
          </div>)}
          {!expenseBreakdown.length && <EmptyState title="Brak kosztów" description="Dodaj pierwszy koszt, aby zobaczyć strukturę kategorii."/>}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader className="flex-col items-start sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#f4f7fa] p-2 text-[#627482]"><Settings2 size={17}/></div>
          <div><h2 className="font-bold text-[#2a3944]">Słowniki finansowe</h2><div className="text-xs text-[#83909b]">własne źródła przychodów i kategorie</div></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FormDisclosure label="Źródło" compact variant="secondary" align="right">{addSourceForm}</FormDisclosure>
          <FormDisclosure label="Kategoria" compact variant="secondary" align="right">{addCategoryForm}</FormDisclosure>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#8b98a3]">Źródła przychodów</div>
            <div className="flex flex-wrap gap-2">{(sources || []).map((source:any) => <Badge key={source.id} variant="neutral">{source.name}</Badge>)}</div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#8b98a3]">Aktywne kategorie</div>
            <div className="flex flex-wrap gap-2">{(categories || []).slice(0,12).map((category:any) => <Badge key={category.id} variant={category.transaction_type === "income" ? "green" : category.scope === "business" ? "blue" : "neutral"}>{category.name}</Badge>)}</div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <div><h2 className="font-bold text-[#2a3944]">Transakcje</h2><div className="text-xs text-[#83909b]">przychody i koszty z wybranego miesiąca</div></div>
        <ReceiptText size={18} className="text-[#81909b]"/>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row:any) => <div key={row.id} className="flex flex-col gap-3 rounded-xl border border-[#edf1f5] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-semibold text-[#40515d]">{row.description}</div>
              <Badge variant={row.transaction_type === "income" ? "green" : "amber"}>{row.transaction_type === "income" ? "Przychód" : "Koszt"}</Badge>
              <Badge variant={row.scope === "business" ? "blue" : "neutral"}>{row.scope === "business" ? "Firmowe" : "Prywatne"}</Badge>
              {row.recurring && <Badge variant="neutral">Cykliczne</Badge>}
            </div>
            <div className="mt-1 text-xs text-[#8996a0]">{row.occurred_on} · {row.finance_categories?.name || "bez kategorii"}{row.transaction_type === "income" && row.finance_sources?.name ? ` · ${row.finance_sources.name}` : ""}</div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className={cn("text-base font-black", row.transaction_type === "income" ? "text-emerald-600" : "text-[#3f4f5a]")}>{row.transaction_type === "income" ? "+" : "−"}{money(Number(row.amount || 0))}</div>
            <div className="flex items-center gap-1">
              <FormDisclosure label="Edytuj" compact variant="secondary" align="right">
                <FinanceTransactionEditForm
                  action={updateFinanceTransaction.bind(null, row.id)}
                  sources={(sources || []) as any[]}
                  categories={(categories || []) as any[]}
                  defaultDate={row.occurred_on}
                  defaults={{
                    transaction_type: row.transaction_type,
                    scope: row.scope,
                    amount: Number(row.amount || 0),
                    occurred_on: row.occurred_on,
                    description: row.description,
                    category_id: row.category_id,
                    source_id: row.source_id,
                    recurring: Boolean(row.recurring),
                    notes: row.notes,
                  }}
                />
              </FormDisclosure>
              <ActionForm action={deleteFinanceTransaction.bind(null, row.id)} successMessage="Transakcja usunięta">
                <Button type="submit" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">Usuń</Button>
              </ActionForm>
            </div>
          </div>
        </div>)}
        {!rows.length && <EmptyState title="Brak transakcji" description="Dodaj pierwszy przychód lub koszt w tym miesiącu."/>}
      </CardContent>
    </Card>
  </div>;
}
