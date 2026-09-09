"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { warsawLocalToUtc } from "@/lib/date";

function parseReminder(value: string) {
  if (!value) return null;
  const [date, time = "09:00"] = value.split("T");
  if (!date) return null;
  return warsawLocalToUtc(date, time.slice(0, 5)).toISOString();
}

function taskPayload(formData: FormData, fallbackUserId: string) {
  const dueTime = String(formData.get("due_time") || "").trim();
  const reminder = String(formData.get("reminder_at") || "").trim();
  return {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    status: String(formData.get("status") || "todo"),
    priority: String(formData.get("priority") || "normal"),
    assigned_to: String(formData.get("assigned_to") || fallbackUserId),
    client_id: String(formData.get("client_id") || "") || null,
    due_date: String(formData.get("due_date") || "") || null,
    due_time: dueTime || null,
    reminder_at: parseReminder(reminder),
  };
}

function revalidateTaskViews() {
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const payload = taskPayload(formData, user.id);
  const { error } = await supabase.from("tasks").insert({ ...payload, created_by: user.id });
  if (error) throw new Error(error.message);
  revalidateTaskViews();
}

export async function updateTask(taskId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const payload = taskPayload(formData, user.id);
  const completedAt = payload.status === "done" ? new Date().toISOString() : null;
  const { error } = await supabase.from("tasks").update({ ...payload, completed_at: completedAt }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateTaskViews();
}

export async function setTaskStatus(taskId: string, status: "todo"|"in_progress"|"waiting"|"done") {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
  }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateTaskViews();
}

export async function rescheduleTask(taskId: string, dueDate: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ due_date: dueDate }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateTaskViews();
}

export async function deleteTask(taskId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateTaskViews();
}
