"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFinanceFile, type ParsedFinanceRow } from "@/lib/finance-import";
import { applyFinanceClassificationRules, type FinanceClassificationRule } from "@/lib/finance-rules";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function optionalText(formData: FormData, key: string) {
  return textValue(formData, key) || null;
}

function amountValue(formData: FormData) {
  const raw = textValue(formData, "amount").replace(",", ".");
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Kwota musi być większa od zera.");
  return Math.round(value * 100) / 100;
}

function revalidateFinance() {
  revalidatePath("/private");
  revalidatePath("/private/finance");
}

export async function createFinanceTransaction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const transactionType = textValue(formData, "transaction_type");
  const scope = textValue(formData, "scope");
  const occurredOn = textValue(formData, "occurred_on");
  const description = textValue(formData, "description");

  if (!["income", "expense"].includes(transactionType)) throw new Error("Nieprawidłowy typ transakcji.");
  if (!["business", "private"].includes(scope)) throw new Error("Nieprawidłowy obszar transakcji.");
  if (!occurredOn) throw new Error("Data transakcji jest wymagana.");
  if (!description) throw new Error("Opis transakcji jest wymagany.");

  const { error } = await supabase.from("finance_transactions").insert({
    user_id: user.id,
    transaction_type: transactionType,
    scope,
    amount: amountValue(formData),
    occurred_on: occurredOn,
    description,
    category_id: optionalText(formData, "category_id"),
    source_id: transactionType === "income" ? optionalText(formData, "source_id") : null,
    recurring: textValue(formData, "recurring") === "on",
    notes: optionalText(formData, "notes"),
  });

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: transactionType === "income" ? "Przychód dodany" : "Koszt dodany" };
}

export async function updateFinanceTransaction(transactionId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const transactionType = textValue(formData, "transaction_type");
  const scope = textValue(formData, "scope");
  const occurredOn = textValue(formData, "occurred_on");
  const description = textValue(formData, "description");

  const { error } = await supabase
    .from("finance_transactions")
    .update({
      transaction_type: transactionType,
      scope,
      amount: amountValue(formData),
      occurred_on: occurredOn,
      description,
      category_id: optionalText(formData, "category_id"),
      source_id: transactionType === "income" ? optionalText(formData, "source_id") : null,
      recurring: textValue(formData, "recurring") === "on",
      notes: optionalText(formData, "notes"),
    })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: "Transakcja zaktualizowana" };
}

export async function deleteFinanceTransaction(transactionId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: "Transakcja usunięta" };
}


export async function createFinanceSource(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const name = textValue(formData, "name");
  if (!name) throw new Error("Nazwa źródła jest wymagana.");

  const { error } = await supabase.from("finance_sources").insert({
    user_id: user.id,
    name,
    active: true,
  });

  if (error) {
    if (String(error.code) === "23505") throw new Error("Takie źródło przychodu już istnieje.");
    throw new Error(error.message);
  }

  revalidateFinance();
  return { ok: true, message: "Źródło przychodu dodane" };
}

export async function createFinanceCategory(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const name = textValue(formData, "name");
  const transactionType = textValue(formData, "transaction_type");
  const scopeRaw = textValue(formData, "scope");

  if (!name) throw new Error("Nazwa kategorii jest wymagana.");
  if (!["income", "expense"].includes(transactionType)) throw new Error("Nieprawidłowy typ kategorii.");
  if (scopeRaw && !["business", "private"].includes(scopeRaw)) throw new Error("Nieprawidłowy obszar kategorii.");

  const { error } = await supabase.from("finance_categories").insert({
    user_id: user.id,
    name,
    transaction_type: transactionType,
    scope: scopeRaw || null,
    active: true,
  });

  if (error) {
    if (String(error.code) === "23505") throw new Error("Taka kategoria już istnieje.");
    throw new Error(error.message);
  }

  revalidateFinance();
  return { ok: true, message: "Kategoria dodana" };
}

export async function archiveFinanceSource(sourceId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("finance_sources")
    .update({ active: false })
    .eq("id", sourceId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: "Źródło ukryte" };
}

export async function archiveFinanceCategory(categoryId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("finance_categories")
    .update({ active: false })
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: "Kategoria ukryta" };
}


export async function previewFinanceImport(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const file = formData.get("file");
  const defaultScope = textValue(formData, "default_scope") === "business" ? "business" : "private";

  if (!(file instanceof File) || file.size === 0) throw new Error("Wybierz plik CSV lub XLSX.");

  const parsed = await parseFinanceFile(file, defaultScope);
  const hashes = parsed.rows.map(row => row.import_hash);
  const existing = new Set<string>();

  for (let i = 0; i < hashes.length; i += 200) {
    const chunk = hashes.slice(i, i + 200);
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("import_hash")
      .eq("user_id", user.id)
      .in("import_hash", chunk);

    if (error) throw new Error(error.message);
    for (const row of data || []) if (row.import_hash) existing.add(String(row.import_hash));
  }

  const { data: rules, error: rulesError } = await supabase
    .from("finance_classification_rules")
    .select("id,name,active,priority,match_field,match_operator,match_value,applies_to_type,set_scope,set_category_id,set_source_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("priority", { ascending: true });
  if (rulesError) throw new Error(rulesError.message);

  const classifiedRows = parsed.rows.map(row => {
    const classified = applyFinanceClassificationRules(
      {
        transaction_type: row.transaction_type,
        description: row.description,
        scope: row.scope,
        category_id: row.category_id,
        source_id: row.source_id,
      },
      (rules || []) as FinanceClassificationRule[]
    );

    return {
      ...row,
      ...classified.row,
      duplicate: existing.has(row.import_hash),
      include: !existing.has(row.import_hash),
      classification_rule_id: classified.matchedRule?.id || null,
      classification_rule_name: classified.matchedRule?.name || null,
    };
  });

  return {
    ok: true,
    fileName: parsed.fileName,
    detected: parsed.detected,
    rows: classifiedRows,
    duplicateCount: classifiedRows.filter(row => row.duplicate).length,
    classifiedCount: classifiedRows.filter(row => row.classification_rule_id).length,
  };
}

type CommitFinanceImportRow = Pick<
  ParsedFinanceRow,
  "occurred_on" | "transaction_type" | "amount" | "description" | "scope" |
  "category_id" | "source_id" | "include" | "import_hash" | "raw_data"
> & { classification_rule_id?: string | null };

export async function commitFinanceImport(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const fileName = textValue(formData, "file_name") || "import bankowy";
  const rowsJson = textValue(formData, "rows_json");

  let rows: CommitFinanceImportRow[];
  try {
    rows = JSON.parse(rowsJson);
  } catch {
    throw new Error("Nie udało się odczytać danych importu.");
  }

  if (!Array.isArray(rows)) throw new Error("Nieprawidłowe dane importu.");
  if (rows.length > 3000) throw new Error("Import może zawierać maksymalnie 3000 transakcji.");

  const selected = rows.filter(row => row && row.include !== false);
  if (!selected.length) throw new Error("Nie wybrano żadnych transakcji do importu.");

  const { data: categories, error: categoriesError } = await supabase
    .from("finance_categories")
    .select("id")
    .eq("user_id", user.id);
  if (categoriesError) throw new Error(categoriesError.message);

  const { data: sources, error: sourcesError } = await supabase
    .from("finance_sources")
    .select("id")
    .eq("user_id", user.id);
  if (sourcesError) throw new Error(sourcesError.message);

  const categoryIds = new Set((categories || []).map(row => String(row.id)));
  const sourceIds = new Set((sources || []).map(row => String(row.id)));

  const { data: classificationRules, error: classificationRulesError } = await supabase
    .from("finance_classification_rules")
    .select("id")
    .eq("user_id", user.id);
  if (classificationRulesError) throw new Error(classificationRulesError.message);
  const classificationRuleIds = new Set((classificationRules || []).map(row => String(row.id)));

  const hashes = selected.map(row => String(row.import_hash || "")).filter(Boolean);
  const existing = new Set<string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const chunk = hashes.slice(i, i + 200);
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("import_hash")
      .eq("user_id", user.id)
      .in("import_hash", chunk);
    if (error) throw new Error(error.message);
    for (const row of data || []) if (row.import_hash) existing.add(String(row.import_hash));
  }

  const validRows = selected.filter(row => row.import_hash && !existing.has(String(row.import_hash)));
  const skippedCount = selected.length - validRows.length;

  const { data: batch, error: batchError } = await supabase
    .from("finance_import_batches")
    .insert({
      user_id: user.id,
      file_name: fileName,
      source_label: "bank",
      row_count: rows.length,
      imported_count: 0,
      skipped_count: skippedCount,
      status: "completed",
    })
    .select("id")
    .single();

  if (batchError) throw new Error(batchError.message);

  let importedCount = 0;

  try {
    const prepared = validRows.map(row => {
      if (!["income","expense"].includes(String(row.transaction_type))) throw new Error("Nieprawidłowy typ transakcji w imporcie.");
      if (!["business","private"].includes(String(row.scope))) throw new Error("Nieprawidłowy obszar transakcji w imporcie.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.occurred_on))) throw new Error("Nieprawidłowa data w imporcie.");

      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nieprawidłowa kwota w imporcie.");

      const categoryId = row.category_id && categoryIds.has(String(row.category_id)) ? String(row.category_id) : null;
      const sourceId = row.source_id && sourceIds.has(String(row.source_id)) ? String(row.source_id) : null;

      return {
        user_id: user.id,
        transaction_type: row.transaction_type,
        scope: row.scope,
        amount: Math.round(amount * 100) / 100,
        occurred_on: row.occurred_on,
        description: String(row.description || "Transakcja bankowa").slice(0, 500),
        category_id: categoryId,
        source_id: row.transaction_type === "income" ? sourceId : null,
        recurring: false,
        import_batch_id: batch.id,
        import_hash: String(row.import_hash),
        import_source: "bank",
        raw_data: row.raw_data || null,
        classification_rule_id: row.classification_rule_id && classificationRuleIds.has(String(row.classification_rule_id))
          ? String(row.classification_rule_id)
          : null,
      };
    });

    for (let i = 0; i < prepared.length; i += 150) {
      const chunk = prepared.slice(i, i + 150);
      const { error } = await supabase.from("finance_transactions").insert(chunk);
      if (error) throw new Error(error.message);
      importedCount += chunk.length;
    }

    const { error: finishError } = await supabase
      .from("finance_import_batches")
      .update({
        imported_count: importedCount,
        skipped_count: skippedCount,
        status: "completed",
      })
      .eq("id", batch.id)
      .eq("user_id", user.id);
    if (finishError) throw new Error(finishError.message);
  } catch (error) {
    await supabase
      .from("finance_import_batches")
      .update({
        imported_count: importedCount,
        skipped_count: skippedCount,
        status: importedCount > 0 ? "partial" : "error",
        error_message: error instanceof Error ? error.message.slice(0, 1000) : "Nieznany błąd importu",
      })
      .eq("id", batch.id)
      .eq("user_id", user.id);
    throw error;
  }

  revalidateFinance();
  return {
    ok: true,
    message: "Import bankowy zakończony",
    description: `${importedCount} zaimportowanych · ${skippedCount} pominiętych duplikatów`,
  };
}


function nonNegativeNumber(formData: FormData, key: string, fallback = 0) {
  const raw = textValue(formData, key).replace(",", ".");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Nieprawidłowa wartość pola ${key}.`);
  return Math.round(value * 1000) / 1000;
}

export async function saveFinanceMonthlySettlement(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const month = textValue(formData, "period_month");
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Nieprawidłowy miesiąc rozliczenia.");

  const payload = {
    user_id: user.id,
    period_month: `${month}-01`,
    actual_income_tax: nonNegativeNumber(formData, "actual_income_tax", 0),
    actual_social_zus: nonNegativeNumber(formData, "actual_social_zus", 0),
    actual_health_contribution: nonNegativeNumber(formData, "actual_health_contribution", 0),
    actual_vat: nonNegativeNumber(formData, "actual_vat", 0),
    other_public_charges: nonNegativeNumber(formData, "other_public_charges", 0),
    unrecorded_costs: nonNegativeNumber(formData, "unrecorded_costs", 0),
    unrecorded_income: nonNegativeNumber(formData, "unrecorded_income", 0),
    notes: optionalText(formData, "notes"),
    confirmed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("finance_monthly_settlements")
    .upsert(payload, { onConflict: "user_id,period_month" });

  if (error) throw new Error(error.message);
  revalidateFinance();

  return {
    ok: true,
    message: "Wynik miesiąca zatwierdzony",
    description: "Finanse używają teraz rzeczywistych obciążeń i korekt tego miesiąca.",
  };
}

export async function saveFinanceTaxProfile(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const taxMethod = textValue(formData, "tax_method") || "profit_rate";
  if (!["profit_rate","revenue_rate","custom"].includes(taxMethod)) {
    throw new Error("Nieprawidłowy sposób estymacji podatku.");
  }

  const taxRate = nonNegativeNumber(formData, "tax_rate", 0);
  const healthContributionRate = nonNegativeNumber(formData, "health_contribution_rate", 9);
  const vatRate = nonNegativeNumber(formData, "vat_rate", 23);
  if (taxRate > 100 || healthContributionRate > 100 || vatRate > 100) throw new Error("Stawka procentowa nie może przekraczać 100%.");

  const { error } = await supabase
    .from("finance_tax_profiles")
    .upsert({
      user_id: user.id,
      tax_method: taxMethod,
      tax_rate: taxRate,
      social_zus_monthly: nonNegativeNumber(formData, "social_zus_monthly", 0),
      health_contribution_rate: healthContributionRate,
      vat_payer: textValue(formData, "vat_payer") === "on",
      vat_rate: vatRate,
      notes: optionalText(formData, "notes"),
    });

  if (error) throw new Error(error.message);
  revalidateFinance();
  return {
    ok: true,
    message: "Profil finansowy zapisany",
    description: "Estymacja netto została przeliczona na nowych założeniach.",
  };
}


export async function createFinanceClassificationRule(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const name = textValue(formData, "name");
  const matchValue = textValue(formData, "match_value");
  const matchOperator = textValue(formData, "match_operator") || "contains";
  const appliesToTypeRaw = textValue(formData, "applies_to_type");
  const setScopeRaw = textValue(formData, "set_scope");
  const categoryId = optionalText(formData, "set_category_id");
  const sourceId = optionalText(formData, "set_source_id");
  const priority = Math.max(0, Math.min(10000, Number(textValue(formData, "priority") || "100")));

  if (!name) throw new Error("Nazwa reguły jest wymagana.");
  if (matchValue.length < 2) throw new Error("Fraza reguły musi mieć co najmniej 2 znaki.");
  if (!["contains","starts_with","exact"].includes(matchOperator)) throw new Error("Nieprawidłowy operator dopasowania.");
  if (appliesToTypeRaw && !["income","expense"].includes(appliesToTypeRaw)) throw new Error("Nieprawidłowy typ transakcji.");
  if (setScopeRaw && !["business","private"].includes(setScopeRaw)) throw new Error("Nieprawidłowy obszar.");

  if (categoryId) {
    const { data } = await supabase.from("finance_categories").select("id").eq("id", categoryId).eq("user_id", user.id).maybeSingle();
    if (!data) throw new Error("Wybrana kategoria nie należy do użytkownika.");
  }
  if (sourceId) {
    const { data } = await supabase.from("finance_sources").select("id").eq("id", sourceId).eq("user_id", user.id).maybeSingle();
    if (!data) throw new Error("Wybrane źródło nie należy do użytkownika.");
  }
  if (!setScopeRaw && !categoryId && !sourceId) throw new Error("Reguła musi ustawiać obszar, kategorię lub źródło.");

  const { data, error } = await supabase.from("finance_classification_rules").insert({
    user_id: user.id,
    name,
    active: true,
    priority: Number.isFinite(priority) ? priority : 100,
    match_field: "description",
    match_operator: matchOperator,
    match_value: matchValue,
    applies_to_type: appliesToTypeRaw || null,
    set_scope: setScopeRaw || null,
    set_category_id: categoryId,
    set_source_id: sourceId,
  }).select("id,name").single();

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: "Reguła klasyfikacji dodana", ruleId: data.id, ruleName: data.name };
}

export async function toggleFinanceClassificationRule(ruleId: string, active: boolean) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("finance_classification_rules")
    .update({ active })
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: active ? "Reguła włączona" : "Reguła wyłączona" };
}

export async function deleteFinanceClassificationRule(ruleId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("finance_classification_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateFinance();
  return { ok: true, message: "Reguła usunięta" };
}
