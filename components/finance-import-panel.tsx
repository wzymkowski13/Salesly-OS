"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, Sparkles, Upload, XCircle } from "lucide-react";
import { commitFinanceImport, createFinanceClassificationRule, previewFinanceImport } from "@/lib/actions/finance";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { suggestRuleMatchValue } from "@/lib/finance-rules";

type Source = { id: string; name: string };
type Category = {
  id: string;
  name: string;
  transaction_type: "income" | "expense";
  scope: "business" | "private" | null;
};

type ImportRow = {
  id: string;
  occurred_on: string;
  transaction_type: "income" | "expense";
  amount: number;
  description: string;
  scope: "business" | "private";
  category_id: string | null;
  source_id: string | null;
  include: boolean;
  duplicate: boolean;
  import_hash: string;
  raw_data: Record<string,string>;
  classification_rule_id?: string | null;
  classification_rule_name?: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(value);
}

export function FinanceImportPanel({
  sources,
  categories,
}: {
  sources: Source[];
  categories: Category[];
}) {
  const [previewing, startPreview] = useTransition();
  const [importing, startImport] = useTransition();
  const [savingRule, startRuleSave] = useTransition();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [detected, setDetected] = useState<Record<string,unknown> | null>(null);
  const [defaultScope, setDefaultScope] = useState<"business"|"private">("private");
  const [ruleDraft, setRuleDraft] = useState<{ rowId: string; matchValue: string } | null>(null);
  const { pushToast } = useToast();

  const selectedRows = useMemo(() => rows.filter(row => row.include && !row.duplicate), [rows]);
  const duplicateCount = rows.filter(row => row.duplicate).length;
  const selectedIncome = selectedRows.filter(row => row.transaction_type === "income").reduce((sum,row) => sum + row.amount, 0);
  const selectedExpense = selectedRows.filter(row => row.transaction_type === "expense").reduce((sum,row) => sum + row.amount, 0);

  function updateRow(id: string, patch: Partial<ImportRow>) {
    setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function applyScope(scope: "business"|"private") {
    setRows(current => current.map(row => row.duplicate ? row : { ...row, scope }));
  }

  function parse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("default_scope", defaultScope);

    startPreview(async () => {
      try {
        const result = await previewFinanceImport(formData);
        setRows(result.rows as ImportRow[]);
        setFileName(result.fileName);
        setDetected(result.detected as Record<string,unknown>);
        pushToast({
          title: "Wyciąg odczytany",
          description: `${result.rows.length} transakcji · ${result.duplicateCount} duplikatów · ${result.classifiedCount || 0} sklasyfikowanych regułami`,
          tone: "success",
        });
      } catch (error) {
        setRows([]);
        setFileName("");
        setDetected(null);
        pushToast({
          title: "Nie udało się odczytać wyciągu",
          description: error instanceof Error ? error.message : "Sprawdź format pliku.",
          tone: "error",
          duration: 7000,
        });
      }
    });
  }

  function saveRule() {
    if (!ruleDraft) return;
    const row = rows.find(item => item.id === ruleDraft.rowId);
    if (!row) return;

    const matchValue = ruleDraft.matchValue.trim();
    if (matchValue.length < 2) {
      pushToast({ title: "Fraza jest za krótka", description: "Podaj co najmniej 2 znaki.", tone: "error" });
      return;
    }

    startRuleSave(async () => {
      try {
        const formData = new FormData();
        formData.set("name", (row.transaction_type === "income" ? "Przychód: " : "Koszt: ") + matchValue);
        formData.set("match_value", matchValue);
        formData.set("match_operator", "contains");
        formData.set("applies_to_type", row.transaction_type);
        formData.set("set_scope", row.scope);
        if (row.category_id) formData.set("set_category_id", row.category_id);
        if (row.source_id) formData.set("set_source_id", row.source_id);
        formData.set("priority", "100");

        const result = await createFinanceClassificationRule(formData);
        updateRow(row.id, { classification_rule_id: result.ruleId, classification_rule_name: result.ruleName });
        setRuleDraft(null);
        pushToast({
          title: "Reguła zapamiętana",
          description: "Kolejne transakcje zawierające „" + matchValue + "” dostaną tę samą klasyfikację.",
          tone: "success",
        });
      } catch (error) {
        pushToast({
          title: "Nie udało się zapisać reguły",
          description: error instanceof Error ? error.message : "Spróbuj ponownie.",
          tone: "error",
        });
      }
    });
  }

  function commit() {
    if (!selectedRows.length) {
      pushToast({ title: "Nie wybrano transakcji", description: "Zaznacz co najmniej jedną pozycję.", tone: "error" });
      return;
    }

    startImport(async () => {
      try {
        const formData = new FormData();
        formData.set("file_name", fileName);
        formData.set("rows_json", JSON.stringify(rows));
        const result = await commitFinanceImport(formData);
        pushToast({
          title: result.message,
          description: result.description,
          tone: "success",
        });
        setRows([]);
        setFileName("");
        setDetected(null);
        window.location.reload();
      } catch (error) {
        pushToast({
          title: "Import nie został zakończony",
          description: error instanceof Error ? error.message : "Spróbuj ponownie.",
          tone: "error",
          duration: 7000,
        });
      }
    });
  }

  if (!rows.length) {
    return <form onSubmit={parse} className="space-y-4">
      <div className="rounded-2xl border border-dashed border-[#cfd8e3] bg-[#fbfcfe] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><FileSpreadsheet size={19}/></div>
          <div>
            <div className="font-bold text-[#34444f]">Import wyciągu bankowego</div>
            <div className="mt-1 text-xs leading-5 text-[#7a8994]">CSV lub XLSX, maks. 8 MB. Najpierw pokażemy podgląd — nic nie trafia do bazy bez Twojego zatwierdzenia.</div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Plik wyciągu</label>
            <Input name="file" type="file" accept=".csv,.xlsx" required className="file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold"/>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Domyślny obszar</label>
            <Select value={defaultScope} onChange={event => setDefaultScope(event.target.value as "business"|"private")}>
              <option value="private">Prywatne</option>
              <option value="business">Firmowe</option>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={previewing}>{previewing ? <Loader2 size={15} className="animate-spin"/> : <Upload size={15}/>} Wczytaj i pokaż podgląd</Button>
      </div>
    </form>;
  }

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-2xl border border-[#dfe6ee] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate font-bold text-[#34444f]">{fileName}</div>
          <Badge variant="green">{rows.length} pozycji</Badge>
          {duplicateCount > 0 && <Badge variant="amber">{duplicateCount} duplikatów</Badge>}
        </div>
        <div className="mt-1 text-xs text-[#81909b]">
          Wybrane: {selectedRows.length} · przychody {money(selectedIncome)} · koszty {money(selectedExpense)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => applyScope("business")}>Wszystkie firmowe</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => applyScope("private")}>Wszystkie prywatne</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setRows([]); setFileName(""); setDetected(null); }}>Wybierz inny plik</Button>
      </div>
    </div>

    {detected && <div className="rounded-xl bg-[#edf3ff] px-3 py-2 text-xs leading-5 text-[#58709f]">
      Rozpoznano nagłówki automatycznie. Przed zatwierdzeniem sprawdź kilka pierwszych pozycji, kwoty i znaki przychodów/kosztów.
    </div>}

    <div className="max-h-[560px] overflow-auto rounded-2xl border border-[#dfe6ee] bg-white salesly-scrollbar">
      <div className="min-w-[980px]">
        <div className="sticky top-0 z-10 grid grid-cols-[42px_110px_100px_1fr_130px_150px_180px_150px] gap-2 border-b border-[#e5eaf0] bg-[#f7f9fc] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8795a1]">
          <div></div><div>Data</div><div>Kwota</div><div>Opis</div><div>Obszar</div><div>Kategoria</div><div>Źródło</div><div>Reguła</div>
        </div>

        {rows.map(row => {
          const availableCategories = categories.filter(category =>
            category.transaction_type === row.transaction_type &&
            (!category.scope || category.scope === row.scope)
          );

          return <div key={row.id} className={`grid grid-cols-[42px_110px_100px_1fr_130px_150px_180px_150px] gap-2 border-b border-[#f0f3f6] px-3 py-2.5 text-sm last:border-b-0 ${row.duplicate ? "bg-amber-50/60 opacity-70" : row.include ? "bg-white" : "bg-[#fafbfd] opacity-60"}`}>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={row.include && !row.duplicate}
                disabled={row.duplicate}
                onChange={event => updateRow(row.id, { include: event.target.checked })}
                className="h-4 w-4 rounded"
              />
            </div>
            <div className="flex items-center text-xs font-semibold text-[#637581]">{row.occurred_on}</div>
            <div className={`flex items-center text-xs font-black ${row.transaction_type === "income" ? "text-emerald-600" : "text-[#475864]"}`}>{row.transaction_type === "income" ? "+" : "−"}{money(row.amount)}</div>
            <div className="min-w-0">
              <div className="line-clamp-2 text-xs font-semibold leading-5 text-[#40515d]">{row.description}</div>
              {row.duplicate && <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700"><XCircle size={11}/> już zaimportowana</div>}
            </div>
            <div>
              <Select value={row.scope} disabled={row.duplicate} onChange={event => updateRow(row.id, { scope: event.target.value as "business"|"private", category_id: null })} className="h-9 text-xs">
                <option value="business">Firmowe</option>
                <option value="private">Prywatne</option>
              </Select>
            </div>
            <div>
              <Select value={row.category_id || ""} disabled={row.duplicate} onChange={event => updateRow(row.id, { category_id: event.target.value || null })} className="h-9 text-xs">
                <option value="">Bez kategorii</option>
                {availableCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
            </div>
            <div>
              {row.transaction_type === "income" ? <Select value={row.source_id || ""} disabled={row.duplicate} onChange={event => updateRow(row.id, { source_id: event.target.value || null })} className="h-9 text-xs">
                <option value="">Bez źródła</option>
                {sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
              </Select> : <div className="flex h-9 items-center text-xs text-[#a0abb3]">—</div>}
            </div>
            <div className="flex items-center">
              {row.classification_rule_name ? <Badge variant="blue">{row.classification_rule_name}</Badge> : !row.duplicate ? <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-full justify-start text-[#5f79ad]"
                onClick={() => setRuleDraft({ rowId: row.id, matchValue: suggestRuleMatchValue(row.description) })}
              ><Sparkles size={13}/> Zapamiętaj</Button> : <span className="text-xs text-[#a0abb3]">—</span>}
            </div>
          </div>;
        })}
      </div>
    </div>

    {ruleDraft && (() => {
      const row = rows.find(item => item.id === ruleDraft.rowId);
      if (!row) return null;
      const categoryName = categories.find(item => item.id === row.category_id)?.name || "bez kategorii";
      const sourceName = sources.find(item => item.id === row.source_id)?.name || "bez źródła";
      return <div className="rounded-2xl border border-[#d9e5fb] bg-[#f7faff] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#3f5f9a]"><Sparkles size={15}/> Zapamiętaj klasyfikację</div>
            <div className="mt-1 text-xs leading-5 text-[#7284a5]">Gdy przyszła transakcja będzie zawierała poniższą frazę, OS ustawi: {row.scope === "business" ? "firmowe" : "prywatne"} · {categoryName}{row.transaction_type === "income" ? " · " + sourceName : ""}.</div>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRuleDraft(null)}>Anuluj</Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={ruleDraft.matchValue}
            onChange={event => setRuleDraft(current => current ? { ...current, matchValue: event.target.value } : current)}
            placeholder="Fraza, np. OPENAI lub META"
          />
          <Button type="button" disabled={savingRule} onClick={saveRule}>{savingRule ? <Loader2 size={15} className="animate-spin"/> : <Sparkles size={15}/>} Zapisz regułę</Button>
        </div>
      </div>;
    })()}

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex items-center gap-2 text-xs text-[#75848f]"><CheckCircle2 size={14} className="text-emerald-600"/> Duplikaty są automatycznie pomijane także przy finalnym zapisie.</div>
      <Button type="button" disabled={importing || !selectedRows.length} onClick={commit}>
        {importing ? <Loader2 size={15} className="animate-spin"/> : <Upload size={15}/>} Importuj {selectedRows.length} transakcji
      </Button>
    </div>
  </div>;
}
