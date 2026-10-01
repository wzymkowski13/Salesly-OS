"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
