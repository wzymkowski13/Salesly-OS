"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { warsawLocalToUtc } from "@/lib/date";

export async function createEvent(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const date = String(formData.get("date") || "");
  const startTime = String(formData.get("start_time") || "09:00");
  const endTime = String(formData.get("end_time") || "");
  const startsAt = warsawLocalToUtc(date, startTime);
  const endsAt = endTime ? warsawLocalToUtc(date, endTime) : null;
  const { error } = await supabase.from("events").insert({
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    event_type: String(formData.get("event_type") || "other"),
    client_id: String(formData.get("client_id") || "") || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/calendar"); revalidatePath("/dashboard");
}
