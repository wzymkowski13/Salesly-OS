"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { warsawLocalToUtc } from "@/lib/date";

function eventPayload(formData: FormData) {
  const date = String(formData.get("date") || "");
  const startTime = String(formData.get("start_time") || "09:00");
  const endTime = String(formData.get("end_time") || "");
  const startsAt = warsawLocalToUtc(date, startTime);
  const endsAt = endTime ? warsawLocalToUtc(date, endTime) : null;
  return {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    event_type: String(formData.get("event_type") || "other"),
    client_id: String(formData.get("client_id") || "") || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() || null,
  };
}

function revalidateEventViews() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createEvent(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const payload = eventPayload(formData);
  const { error } = await supabase.from("events").insert({ ...payload, created_by: user.id });
  if (error) throw new Error(error.message);
  revalidateEventViews();
}

export async function updateEvent(eventId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const payload = eventPayload(formData);
  const { error } = await supabase.from("events").update(payload).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidateEventViews();
}

export async function rescheduleEvent(eventId: string, date: string, startTime: string, endTime?: string | null) {
  await requireUser();
  const supabase = await createClient();
  const startsAt = warsawLocalToUtc(date, startTime).toISOString();
  const endsAt = endTime ? warsawLocalToUtc(date, endTime).toISOString() : null;
  const { error } = await supabase.from("events").update({ starts_at: startsAt, ends_at: endsAt }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidateEventViews();
}

export async function deleteEvent(eventId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidateEventViews();
}
