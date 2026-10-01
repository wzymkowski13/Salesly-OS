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
