import Link from "next/link";
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { pl } from "date-fns/locale";
import { BadgeCheck, BarChart3, Building2, Calculator, ChevronLeft, ChevronRight, CircleDollarSign, FileUp, Plus, ReceiptText, Settings2, Sparkles, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInWarsaw } from "@/lib/date";
import { createFinanceCategory, createFinanceClassificationRule, createFinanceSource, deleteFinanceClassificationRule, deleteFinanceTransaction, saveFinanceMonthlySettlement, saveFinanceTaxProfile, toggleFinanceClassificationRule, updateFinanceTransaction } from "@/lib/actions/finance";
import { FinanceTransactionEditForm, FinanceTransactionForm } from "@/components/finance-transaction-form";
import { FinanceImportPanel } from "@/components/finance-import-panel";
import { SectionHeader } from "@/components/section-header";
import { FormDisclosure } from "@/components/form-disclosure";
import { ActionForm } from "@/components/action-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    { data: importBatches, error: importBatchesError },
    taxProfileResult,
    analyticsResult,
    classificationRulesResult,
    settlementResult,
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
    supabase.from("finance_import_batches").select("id,file_name,row_count,imported_count,skipped_count,status,error_message,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("finance_tax_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("finance_transactions")
      .select("transaction_type,scope,amount,occurred_on")
      .eq("user_id", user.id)
      .gte("occurred_on", format(startOfMonth(addMonths(focus, -12)), "yyyy-MM-dd"))
      .lte("occurred_on", to)
      .order("occurred_on"),
    supabase.from("finance_classification_rules")
      .select("id,name,active,priority,match_operator,match_value,applies_to_type,set_scope,set_category_id,set_source_id,created_at")
      .eq("user_id", user.id)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("finance_monthly_settlements")
      .select("*")
      .eq("user_id", user.id)
      .eq("period_month", `${requestedMonth}-01`)
      .maybeSingle(),
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

  const importReady = !importBatchesError;
  const taxReady = !taxProfileResult.error;
  const rulesReady = !classificationRulesResult.error;
  const settlementReady = !settlementResult.error;
  const classificationRules = classificationRulesResult.data || [];
  const settlement = settlementResult.data as any;
  const taxProfile = taxProfileResult.data as any;
  const analyticsRows = analyticsResult.data || [];
  const rows = transactions || [];
  const incomeRows = rows.filter((row:any) => row.transaction_type === "income");
  const expenseRows = rows.filter((row:any) => row.transaction_type === "expense");
  const income = incomeRows.reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const expenses = expenseRows.reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const balance = income - expenses;
  const businessIncome = incomeRows.filter((row:any) => row.scope === "business").reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const businessExpenses = expenseRows.filter((row:any) => row.scope === "business").reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const privateExpenses = expenseRows.filter((row:any) => row.scope === "private").reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);

  const socialZus = Number(taxProfile?.social_zus_monthly || 0);
  const healthContributionRate = Number(taxProfile?.health_contribution_rate ?? 9);
  const taxRate = Number(taxProfile?.tax_rate || 0);
  const taxMethod = String(taxProfile?.tax_method || "profit_rate");
  const taxableBase = taxMethod === "revenue_rate"
    ? Math.max(0, businessIncome - socialZus)
    : Math.max(0, businessIncome - businessExpenses - socialZus);
  const healthContributionBase = Math.max(0, businessIncome - businessExpenses - socialZus);
  const healthContribution = taxProfile ? healthContributionBase * healthContributionRate / 100 : 0;
  const estimatedTax = taxProfile ? taxableBase * taxRate / 100 : 0;
  const estimatedBusinessNet = taxProfile
    ? businessIncome - businessExpenses - socialZus - healthContribution - estimatedTax
    : null;

  const settlementRecordedExpenses = expenseRows
    .filter((row:any) =>
      row.scope === "business"
      && ["Podatki","ZUS"].includes(String(row.finance_categories?.name || ""))
    )
    .reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const operatingBusinessExpenses = Math.max(0, businessExpenses - settlementRecordedExpenses);
  const actualPublicCharges = settlement
    ? Number(settlement.actual_income_tax || 0)
      + Number(settlement.actual_social_zus || 0)
      + Number(settlement.actual_health_contribution || 0)
      + Number(settlement.actual_vat || 0)
      + Number(settlement.other_public_charges || 0)
    : 0;
  const confirmedBusinessNet = settlement
    ? businessIncome
      + Number(settlement.unrecorded_income || 0)
      - operatingBusinessExpenses
      - Number(settlement.unrecorded_costs || 0)
      - actualPublicCharges
    : null;
  const confirmedVsEstimate = confirmedBusinessNet !== null && estimatedBusinessNet !== null
    ? confirmedBusinessNet - estimatedBusinessNet
    : null;

  const monthlyStats = Array.from({ length: 13 }, (_, index) => {
    const date = addMonths(focus, index - 12);
    const key = format(date, "yyyy-MM");
    const monthRows = analyticsRows.filter((row:any) => String(row.occurred_on).startsWith(key));
    const monthIncome = monthRows.filter((row:any) => row.transaction_type === "income").reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
    const monthExpense = monthRows.filter((row:any) => row.transaction_type === "expense").reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
    return { key, date, income: monthIncome, expense: monthExpense, balance: monthIncome - monthExpense };
  });
  const trend12 = monthlyStats.slice(1);
  const currentStats = monthlyStats[12];
  const previousStats = monthlyStats[11];
  const yearAgoStats = monthlyStats[0];
  const pctChange = (current:number, base:number) => base === 0 ? null : ((current - base) / Math.abs(base)) * 100;
  const incomeMoM = pctChange(currentStats.income, previousStats.income);
  const incomeYoY = pctChange(currentStats.income, yearAgoStats.income);
  const trendMax = Math.max(1, ...trend12.flatMap(item => [item.income,item.expense]));

  const incomeBreakdown = aggregate(incomeRows, row => row.finance_sources?.name || "Bez źródła");
  const expenseBreakdown = aggregate(expenseRows, row => row.finance_categories?.name || "Bez kategorii");
  const maxIncome = Math.max(1, ...incomeBreakdown.map(([,value]) => value));
  const maxExpense = Math.max(1, ...expenseBreakdown.map(([,value]) => value));

  const addForm = <FinanceTransactionForm
    sources={(sources || []) as any[]}
    categories={(categories || []) as any[]}
    defaultDate={todayInWarsaw()}
  />;

  const importForm = importReady ? <FinanceImportPanel
    sources={(sources || []) as any[]}
    categories={(categories || []) as any[]}
  /> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
    Import bankowy wymaga migracji <strong>010_finance_bank_import.sql</strong>.
  </div>;

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

  const taxProfileForm = taxReady ? <ActionForm
    action={saveFinanceTaxProfile}
    successMessage="Profil finansowy zapisany"
    className="grid gap-4 md:grid-cols-2"
  >
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Sposób estymacji podatku</label>
      <Select name="tax_method" defaultValue={taxProfile?.tax_method || "profit_rate"}>
        <option value="profit_rate">Procent od dochodu (przychód − koszty)</option>
        <option value="revenue_rate">Procent od przychodu</option>
        <option value="custom">Niestandardowo od dochodu</option>
      </Select>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Stawka podatku (%)</label>
      <Input name="tax_rate" type="number" min="0" max="100" step="0.001" defaultValue={Number(taxProfile?.tax_rate ?? 12)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">ZUS społeczny / mies.</label>
      <Input name="social_zus_monthly" type="number" min="0" step="0.01" defaultValue={Number(taxProfile?.social_zus_monthly ?? 0)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Składka zdrowotna (% dochodu)</label>
      <Input name="health_contribution_rate" type="number" min="0" max="100" step="0.001" defaultValue={Number(taxProfile?.health_contribution_rate ?? 9)}/>
      <div className="mt-1 text-[11px] leading-4 text-[#8a98a3]">Liczona od: przychód firmowy − koszty firmowe − ZUS społeczny.</div>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">VAT</label>
      <label className="flex h-10 items-center gap-2 rounded-xl border border-[#dbe3ec] bg-white px-3 text-sm text-[#536674]">
        <input type="checkbox" name="vat_payer" defaultChecked={Boolean(taxProfile?.vat_payer)} className="h-4 w-4 rounded"/>
        Jestem podatnikiem VAT
      </label>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Stawka VAT (%)</label>
      <Input name="vat_rate" type="number" min="0" max="100" step="0.001" defaultValue={Number(taxProfile?.vat_rate ?? 23)}/>
    </div>
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Założenia / notatka</label>
      <Textarea name="notes" rows={3} defaultValue={taxProfile?.notes || ""} placeholder="Np. stawka uśredniona do szybkiego planowania cashflow"/>
    </div>
    <div className="md:col-span-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
      To jest kalkulator operacyjny. Nie zastępuje księgowości; VAT nie jest jeszcze wliczany do estymowanego netto.
    </div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit">Zapisz założenia</Button></div>
  </ActionForm> : <div className="text-sm text-amber-700">Uruchom migrację 011, aby włączyć kalkulator netto.</div>;

  const settlementForm = settlementReady ? <ActionForm
    action={saveFinanceMonthlySettlement}
    successMessage="Wynik miesiąca zatwierdzony"
    className="grid gap-4 md:grid-cols-2"
  >
    <input type="hidden" name="period_month" value={requestedMonth}/>
    <div className="md:col-span-2 rounded-xl bg-[#edf7f1] px-3 py-2.5 text-xs leading-5 text-[#527061]">
      Wpisz rzeczywiste wartości z rozliczenia miesiąca. Transakcje zakwalifikowane jako <strong>Podatki</strong> lub <strong>ZUS</strong> są zastępowane poniższymi kwotami, żeby ich nie dublować.
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Podatek dochodowy PIT/CIT</label>
      <Input name="actual_income_tax" type="number" min="0" step="0.01" defaultValue={Number(settlement?.actual_income_tax ?? estimatedTax).toFixed(2)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">ZUS społeczny</label>
      <Input name="actual_social_zus" type="number" min="0" step="0.01" defaultValue={Number(settlement?.actual_social_zus ?? socialZus).toFixed(2)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Składka zdrowotna</label>
      <Input name="actual_health_contribution" type="number" min="0" step="0.01" defaultValue={Number(settlement?.actual_health_contribution ?? healthContribution).toFixed(2)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">VAT do zapłaty</label>
      <Input name="actual_vat" type="number" min="0" step="0.01" defaultValue={Number(settlement?.actual_vat ?? 0).toFixed(2)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Inne obciążenia publiczne</label>
      <Input name="other_public_charges" type="number" min="0" step="0.01" defaultValue={Number(settlement?.other_public_charges ?? 0).toFixed(2)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Koszty nieujęte w OS</label>
      <Input name="unrecorded_costs" type="number" min="0" step="0.01" defaultValue={Number(settlement?.unrecorded_costs ?? 0).toFixed(2)}/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przychody nieujęte w OS</label>
      <Input name="unrecorded_income" type="number" min="0" step="0.01" defaultValue={Number(settlement?.unrecorded_income ?? 0).toFixed(2)}/>
    </div>
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatka do rozliczenia</label>
      <Textarea name="notes" rows={3} defaultValue={settlement?.notes || ""} placeholder="Np. wartości z rozliczenia księgowej za miesiąc"/>
    </div>
    <div className="md:col-span-2 rounded-xl bg-[#f7f9fc] px-3 py-2 text-[11px] leading-5 text-[#72818c]">
      Wynik zatwierdzony = przychody firmowe + korekty przychodów − koszty operacyjne − korekty kosztów − rzeczywiste podatki i składki.
    </div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit"><BadgeCheck size={15}/> {settlement ? "Zapisz rozliczenie ponownie" : "Zatwierdź wynik miesiąca"}</Button></div>
  </ActionForm> : <div className="text-sm text-amber-700">Uruchom migrację 017, aby włączyć zatwierdzanie miesięcznego wyniku netto.</div>;

  const addRuleForm = rulesReady ? <ActionForm
    action={createFinanceClassificationRule}
    successMessage="Reguła klasyfikacji dodana"
    resetOnSuccess
    className="grid gap-4 md:grid-cols-2"
  >
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa reguły</label>
      <Input name="name" required placeholder="Np. Meta Ads → Marketing"/>
    </div>
    <div className="md:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Gdy opis zawiera</label>
      <Input name="match_value" required minLength={2} placeholder="Np. META, OPENAI, ZUS"/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Dopasowanie</label>
      <Select name="match_operator" defaultValue="contains"><option value="contains">Zawiera</option><option value="starts_with">Zaczyna się od</option><option value="exact">Dokładnie równe</option></Select>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ transakcji</label>
      <Select name="applies_to_type" defaultValue=""><option value="">Dowolny</option><option value="expense">Koszt</option><option value="income">Przychód</option></Select>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Ustaw obszar</label>
      <Select name="set_scope" defaultValue=""><option value="">Nie zmieniaj</option><option value="business">Firmowe</option><option value="private">Prywatne</option></Select>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Priorytet</label>
      <Input name="priority" type="number" min="0" max="10000" defaultValue="100"/>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Kategoria</label>
      <Select name="set_category_id" defaultValue=""><option value="">Nie ustawiaj</option>{(categories || []).map((category:any) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Źródło przychodu</label>
      <Select name="set_source_id" defaultValue=""><option value="">Nie ustawiaj</option>{(sources || []).map((source:any) => <option key={source.id} value={source.id}>{source.name}</option>)}</Select>
    </div>
    <div className="md:col-span-2 rounded-xl bg-[#edf3ff] px-3 py-2 text-xs leading-5 text-[#58709f]">
      Reguły są sprawdzane od najniższego priorytetu. Pierwsza pasująca reguła wygrywa.
    </div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit"><Sparkles size={15}/> Dodaj regułę</Button></div>
  </ActionForm> : <div className="text-sm text-amber-700">Uruchom migrację 013, aby włączyć reguły automatycznej klasyfikacji.</div>;

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
      action={<div className="flex flex-wrap gap-2">
        <FormDisclosure label="Import bankowy" variant="secondary" align="right">{importForm}</FormDisclosure>
        <FormDisclosure label="Dodaj transakcję" align="right">{addForm}</FormDisclosure>
      </div>}
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

    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <Card className={settlement ? "border-emerald-300" : taxProfile ? "border-emerald-200" : ""}>
        <CardHeader className="flex-col items-start sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">{settlement ? <BadgeCheck size={18}/> : <Calculator size={18}/>}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#2a3944]">Wynik netto firmy</h2>{settlement && <Badge variant="green">Zatwierdzony</Badge>}</div>
              <div className="text-xs text-[#83909b]">{settlement ? "rzeczywiste rozliczenie miesiąca" : "prognoza do czasu zatwierdzenia rozliczenia"}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <FormDisclosure label="Założenia" compact variant="secondary" align="right">{taxProfileForm}</FormDisclosure>
            <FormDisclosure label={settlement ? "Rozliczenie" : "Zatwierdź miesiąc"} compact variant={settlement ? "secondary" : "primary"} align="right">{settlementForm}</FormDisclosure>
          </div>
        </CardHeader>
        <CardContent>
          {settlement && confirmedBusinessNet !== null ? <div className="space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-emerald-700">Zatwierdzone netto</div>
              <div className={cn("mt-1 text-3xl font-black tracking-[-0.04em]", confirmedBusinessNet >= 0 ? "text-emerald-600" : "text-red-600")}>{money(confirmedBusinessNet)}</div>
              <div className="mt-1 text-[11px] text-[#8996a0]">zatwierdzono {new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(settlement.confirmed_at))}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">Koszty operacyjne</div><div className="mt-1 font-bold text-[#40515d]">{money(operatingBusinessExpenses)}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">Podatek dochodowy</div><div className="mt-1 font-bold text-[#40515d]">{money(Number(settlement.actual_income_tax || 0))}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">ZUS + zdrowotna</div><div className="mt-1 font-bold text-[#40515d]">{money(Number(settlement.actual_social_zus || 0) + Number(settlement.actual_health_contribution || 0))}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">VAT + inne</div><div className="mt-1 font-bold text-[#40515d]">{money(Number(settlement.actual_vat || 0) + Number(settlement.other_public_charges || 0))}</div></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#edf7f1] px-3 py-2 text-[11px] text-[#527061]">
              <span>Prognoza systemu: {estimatedBusinessNet === null ? "—" : money(estimatedBusinessNet)}</span>
              {confirmedVsEstimate !== null && <span className="font-bold">różnica: {confirmedVsEstimate >= 0 ? "+" : ""}{money(confirmedVsEstimate)}</span>}
            </div>
          </div> : taxProfile ? <div className="space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8795a1]">Prognoza netto</div>
              <div className={cn("mt-1 text-3xl font-black tracking-[-0.04em]", Number(estimatedBusinessNet || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>{money(Number(estimatedBusinessNet || 0))}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">Przychód firmowy</div><div className="mt-1 font-bold text-[#40515d]">{money(businessIncome)}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">Koszty firmowe</div><div className="mt-1 font-bold text-[#40515d]">{money(businessExpenses)}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">Podatek est.</div><div className="mt-1 font-bold text-[#40515d]">{money(estimatedTax)}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">ZUS + zdrowotna</div><div className="mt-1 font-bold text-[#40515d]">{money(socialZus + healthContribution)}</div></div>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">To prognoza. Po otrzymaniu rzeczywistych wartości z księgowości użyj „Zatwierdź miesiąc”, aby zapisać dokładny wynik.</div>
          </div> : <EmptyState title="Ustaw założenia" description="Podaj stawkę podatku i miesięczne składki, a OS zacznie liczyć prognozę netto firmy."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><BarChart3 size={18}/></div>
            <div><h2 className="font-bold text-[#2a3944]">Trend 12 miesięcy</h2><div className="text-xs text-[#83909b]">przychody vs koszty</div></div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={incomeMoM === null ? "neutral" : incomeMoM >= 0 ? "green" : "red"}>m/m {incomeMoM === null ? "—" : `${incomeMoM >= 0 ? "+" : ""}${incomeMoM.toFixed(1)}%`}</Badge>
            <Badge variant={incomeYoY === null ? "neutral" : incomeYoY >= 0 ? "green" : "red"}>r/r {incomeYoY === null ? "—" : `${incomeYoY >= 0 ? "+" : ""}${incomeYoY.toFixed(1)}%`}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-[190px] items-end gap-2 overflow-x-auto pb-2 salesly-scrollbar">
            {trend12.map(item => <div key={item.key} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
              <div className="flex h-[145px] w-full items-end justify-center gap-1">
                <div title={`Przychody: ${money(item.income)}`} className="w-[12px] rounded-t-md bg-emerald-400" style={{height:`${Math.max(item.income > 0 ? 5 : 0,(item.income/trendMax)*100)}%`}}/>
                <div title={`Koszty: ${money(item.expense)}`} className="w-[12px] rounded-t-md bg-amber-400" style={{height:`${Math.max(item.expense > 0 ? 5 : 0,(item.expense/trendMax)*100)}%`}}/>
              </div>
              <div className="text-[9px] font-semibold uppercase text-[#8a98a3]">{format(item.date,"LLL",{locale:pl})}</div>
            </div>)}
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-[#74838e]"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-400"/> przychody</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-400"/> koszty</span></div>
        </CardContent>
      </Card>
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

    {importReady && (importBatches || []).length > 0 && <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><FileUp size={17}/></div>
          <div><h2 className="font-bold text-[#2a3944]">Ostatnie importy bankowe</h2><div className="text-xs text-[#83909b]">historia ostatnich plików</div></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(importBatches || []).map((batch:any) => <div key={batch.id} className="flex flex-col gap-2 rounded-xl border border-[#edf1f5] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-semibold text-[#40515d]">{batch.file_name}</div>
              <Badge variant={batch.status === "completed" ? "green" : batch.status === "partial" ? "amber" : "red"}>{batch.status === "completed" ? "Gotowe" : batch.status === "partial" ? "Częściowy" : "Błąd"}</Badge>
            </div>
            <div className="mt-1 text-xs text-[#8996a0]">{new Intl.DateTimeFormat("pl-PL",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(batch.created_at))}</div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-[#f6f8fa] px-2.5 py-1.5 text-[#647581]">{batch.imported_count || 0} zaimportowanych</span>
            {(batch.skipped_count || 0) > 0 && <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700">{batch.skipped_count} pominiętych</span>}
          </div>
        </div>)}
      </CardContent>
    </Card>}

    <Card className={rulesReady && classificationRules.length ? "border-[#d9e5fb]" : ""}>
      <CardHeader className="flex-col items-start sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><Sparkles size={17}/></div>
          <div><h2 className="font-bold text-[#2a3944]">Reguły automatycznej klasyfikacji</h2><div className="text-xs text-[#83909b]">OS rozpoznaje powtarzalne transakcje już na podglądzie importu</div></div>
        </div>
        <FormDisclosure label="Dodaj regułę" compact align="right">{addRuleForm}</FormDisclosure>
      </CardHeader>
      <CardContent>
        {rulesReady ? <div className="space-y-2">
          {(classificationRules || []).map((rule:any) => {
            const categoryName = (categories || []).find((item:any) => item.id === rule.set_category_id)?.name;
            const sourceName = (sources || []).find((item:any) => item.id === rule.set_source_id)?.name;
            return <div key={rule.id} className={`flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${rule.active ? "border-[#e4eaf1] bg-white" : "border-[#edf0f3] bg-[#fafbfc] opacity-65"}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><div className="truncate text-sm font-bold text-[#40515d]">{rule.name}</div><Badge variant={rule.active ? "green" : "neutral"}>{rule.active ? "Aktywna" : "Wyłączona"}</Badge><Badge variant="neutral">P{rule.priority}</Badge></div>
                <div className="mt-1 text-xs leading-5 text-[#81909b]">Opis {rule.match_operator === "exact" ? "=" : rule.match_operator === "starts_with" ? "zaczyna się od" : "zawiera"} „{rule.match_value}” → {[rule.set_scope === "business" ? "firmowe" : rule.set_scope === "private" ? "prywatne" : null, categoryName, sourceName].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <ActionForm action={toggleFinanceClassificationRule.bind(null, rule.id, !rule.active)} successMessage={rule.active ? "Reguła wyłączona" : "Reguła włączona"}><Button type="submit" size="sm" variant="secondary">{rule.active ? "Wyłącz" : "Włącz"}</Button></ActionForm>
                <ActionForm action={deleteFinanceClassificationRule.bind(null, rule.id)} successMessage="Reguła usunięta"><Button type="submit" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">Usuń</Button></ActionForm>
              </div>
            </div>;
          })}
          {!(classificationRules || []).length && <EmptyState title="Brak reguł" description="Dodaj pierwszą regułę albo utwórz ją przy konkretnej transakcji w podglądzie importu."/>}
        </div> : <div className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-800">Uruchom migrację 013, aby włączyć reguły klasyfikacji.</div>}
      </CardContent>
    </Card>

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
