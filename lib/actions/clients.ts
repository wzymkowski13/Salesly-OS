"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function createCustomer(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const tags = String(formData.get("tags") || "").split(",").map(v => v.trim()).filter(Boolean);
  const { data, error } = await supabase.from("clients").insert({
    kind: String(formData.get("kind") || "company"),
    status: String(formData.get("status") || "active"),
    name: String(formData.get("name") || "").trim(),
    nip: String(formData.get("nip") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    city: String(formData.get("city") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    postal_code: String(formData.get("postal_code") || "").trim() || null,
    owner_id: String(formData.get("owner_id") || user.id),
    tags,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.id,
  }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/crm/${data.id}`);
}

export async function addContact(clientId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    client_id: clientId,
    full_name: String(formData.get("full_name") || "").trim(),
    role: String(formData.get("role") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    is_primary: formData.get("is_primary") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/${clientId}`);
}

export async function addPolicy(clientId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const premiumText = String(formData.get("premium") || "").replace(",", ".");
  const memberText = String(formData.get("member_count") || "");
  const { error } = await supabase.from("policies").insert({
    client_id: clientId,
    category: String(formData.get("category") || "other"),
    insurer: String(formData.get("insurer") || "PZU").trim(),
    product_name: String(formData.get("product_name") || "").trim() || null,
    policy_number: String(formData.get("policy_number") || "").trim() || null,
    premium: premiumText ? Number(premiumText) : null,
    member_count: memberText ? Number(memberText) : null,
    start_date: String(formData.get("start_date") || "") || null,
    end_date: String(formData.get("end_date") || "") || null,
    renewal_date: String(formData.get("renewal_date") || "") || null,
    annual_review: formData.get("annual_review") === "on",
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  await supabase.from("activities").insert({
    client_id: clientId,
    activity_type: "system",
    title: "Dodano produkt / polisę",
    content: String(formData.get("product_name") || formData.get("category") || "Polisa"),
    created_by: user.id,
  });
  revalidatePath(`/crm/${clientId}`); revalidatePath("/renewals"); revalidatePath("/dashboard");
}

export async function addActivity(clientId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    client_id: clientId,
    activity_type: String(formData.get("activity_type") || "note"),
    title: String(formData.get("title") || "Notatka").trim(),
    content: String(formData.get("content") || "").trim() || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/${clientId}`);
}

export async function archiveClient(clientId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ archived_at: new Date().toISOString(), status: "inactive" }).eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/crm"); redirect("/crm");
}

export async function updateCustomer(clientId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const tags = String(formData.get("tags") || "").split(",").map(v => v.trim()).filter(Boolean);
  const { error } = await supabase.from("clients").update({
    kind: String(formData.get("kind") || "company"),
    status: String(formData.get("status") || "active"),
    name: String(formData.get("name") || "").trim(),
    nip: String(formData.get("nip") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    city: String(formData.get("city") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    postal_code: String(formData.get("postal_code") || "").trim() || null,
    owner_id: String(formData.get("owner_id") || "") || null,
    tags,
    notes: String(formData.get("notes") || "").trim() || null,
  }).eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/crm/${clientId}`);
  revalidatePath("/crm");
}
