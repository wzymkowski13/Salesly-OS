"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const dueTime = String(formData.get("due_time") || "").trim();
  const reminder = String(formData.get("reminder_at") || "").trim();
  const { error } = await supabase.from("tasks").insert({
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    priority: String(formData.get("priority") || "normal"),
    assigned_to: String(formData.get("assigned_to") || user.id),
    client_id: String(formData.get("client_id") || "") || null,
    due_date: String(formData.get("due_date") || "") || null,
    due_time: dueTime || null,
    reminder_at: reminder ? new Date(reminder).toISOString() : null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/tasks"); revalidatePath("/dashboard");
}

export async function setTaskStatus(taskId: string, status: "todo"|"in_progress"|"waiting"|"done") {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
  }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/tasks"); revalidatePath("/dashboard");
}
