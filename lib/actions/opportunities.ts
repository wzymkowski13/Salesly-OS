"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const allowedStages = new Set(["new", "contact", "meeting", "offer", "decision", "won", "lost"]);

export async function createOpportunity(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const valueText = String(formData.get("estimated_value") || "").replace(",", ".");
  const probabilityText = String(formData.get("probability") || "");
  const stage = String(formData.get("stage") || "new");

  if (!allowedStages.has(stage)) throw new Error("Nieprawidłowy etap szansy.");

  const { error } = await supabase.from("opportunities").insert({
    client_id: String(formData.get("client_id") || ""),
    title: String(formData.get("title") || "").trim(),
    category: String(formData.get("category") || "other"),
    stage,
    estimated_value: valueText ? Number(valueText) : null,
    probability: probabilityText ? Number(probabilityText) : null,
    next_step: String(formData.get("next_step") || "").trim() || null,
    expected_close_date: String(formData.get("expected_close_date") || "") || null,
    owner_id: String(formData.get("owner_id") || user.id),
    source: String(formData.get("source") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function updateOpportunityStage(id: string, stage: string) {
  await requireUser();
  if (!allowedStages.has(stage)) throw new Error("Nieprawidłowy etap szansy.");
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}
