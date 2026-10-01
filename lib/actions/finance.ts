"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFinanceFile, type ParsedFinanceRow } from "@/lib/finance-import";

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

  return {
    ok: true,
    fileName: parsed.fileName,
    detected: parsed.detected,
    rows: parsed.rows.map(row => ({
      ...row,
      duplicate: existing.has(row.import_hash),
      include: !existing.has(row.import_hash),
    })),
    duplicateCount: parsed.rows.filter(row => existing.has(row.import_hash)).length,
  };
}

type CommitFinanceImportRow = Pick<
  ParsedFinanceRow,
  "occurred_on" | "transaction_type" | "amount" | "description" | "scope" |
  "category_id" | "source_id" | "include" | "import_hash" | "raw_data"
>;

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
