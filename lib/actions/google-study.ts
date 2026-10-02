"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAnyPermission, requirePermission } from "@/lib/permissions";
import { googleApiFetch, getGoogleIntegration } from "@/lib/google";
import { parseStudyIcs } from "@/lib/ics";
import { warsawLocalToUtc } from "@/lib/date";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function studyRange(formData: FormData) {
  const from = textValue(formData, "from");
  const to = textValue(formData, "to");
  if (!from || !to) throw new Error("Podaj zakres dat importu.");
  const start = warsawLocalToUtc(from, "00:00");
  const end = warsawLocalToUtc(to, "23:59");
  if (end < start) throw new Error("Data końcowa nie może być wcześniejsza od początkowej.");
  return { start, end };
}

async function verifySubject(userId: string, subjectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_subjects")
    .select("id,name,lecturer")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nie znaleziono przedmiotu.");
  return data;
}

function revalidateStudy(subjectId: string) {
  revalidatePath("/private");
  revalidatePath("/private/study");
  revalidatePath(`/private/study/${subjectId}`);
}

export async function disconnectGoogle() {
  const { user } = await requireAnyPermission(["settings.integrations","private.study"]);
  const admin = createAdminClient();
  const integration = await getGoogleIntegration(user.id);

  if (integration?.access_token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(integration.access_token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        cache: "no-store",
      });
    } catch {}
  }

  const { error } = await admin.from("google_integrations").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function importStudyFromGoogle(subjectId: string, formData: FormData) {
  const { user } = await requirePermission("private.study");
  const subject = await verifySubject(user.id, subjectId);
  const { start, end } = studyRange(formData);
  const query = textValue(formData, "query");
  const classType = textValue(formData, "class_type") || "lecture";
  const integration = await getGoogleIntegration(user.id);
  if (!integration) throw new Error("Najpierw podłącz Google w Ustawieniach.");

  const calendarId = integration.calendar_id || "primary";
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: "2500",
  });
  if (query) params.set("q", query);

  const response = await googleApiFetch(
    user.id,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );
  const data = await response.json();
  const events = Array.isArray(data.items) ? data.items : [];

  const rows = events.flatMap((item: any) => {
    const startsAt = item.start?.dateTime;
    if (!startsAt || !item.id) return [];
    return [{
      user_id: user.id,
      subject_id: subjectId,
      class_type: classType,
      title: item.summary || subject.name,
      lecturer: subject.lecturer || null,
      room: item.location || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: item.end?.dateTime ? new Date(item.end.dateTime).toISOString() : null,
      attendance_status: "unknown",
      notes: item.description || null,
      source: "google",
      external_event_id: item.id,
    }];
  });

  if (!rows.length) throw new Error("Google Calendar nie zwrócił żadnych godzinowych wydarzeń w tym zakresie.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("study_classes")
    .upsert(rows, { onConflict: "user_id,source,external_event_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function importStudyIcs(subjectId: string, formData: FormData) {
  const { user } = await requirePermission("private.study");
  const subject = await verifySubject(user.id, subjectId);
  const { start, end } = studyRange(formData);
  const classType = textValue(formData, "class_type") || "lecture";
  const file = formData.get("file");

  if (!(file instanceof File) || !file.size) throw new Error("Wybierz plik .ics.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Plik ICS jest zbyt duży (limit 2 MB).");

  const parsed = parseStudyIcs(await file.text(), start, end);
  if (!parsed.length) throw new Error("Nie znaleziono zajęć godzinowych w podanym zakresie.");

  const rows = parsed.map(item => ({
    user_id: user.id,
    subject_id: subjectId,
    class_type: classType,
    title: item.summary || subject.name,
    lecturer: subject.lecturer || null,
    room: item.location || null,
    starts_at: item.instanceStart.toISOString(),
    ends_at: item.instanceEnd?.toISOString() || null,
    attendance_status: "unknown",
    notes: null,
    source: "ics",
    external_event_id: item.externalId,
  }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("study_classes")
    .upsert(rows, { onConflict: "user_id,source,external_event_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function createStudyGoogleDoc(subjectId: string, classId: string | null, formData: FormData) {
  const { user } = await requirePermission("private.study");
  const subject = await verifySubject(user.id, subjectId);
  let title = textValue(formData, "title");

  const supabase = await createClient();
  let studyClass: any = null;
  if (classId) {
    const { data, error } = await supabase
      .from("study_classes")
      .select("id,title,starts_at")
      .eq("id", classId)
      .eq("subject_id", subjectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    studyClass = data;
  }

  if (!title) {
    if (studyClass) {
      const date = new Intl.DateTimeFormat("pl-PL", {
        timeZone: "Europe/Warsaw",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(studyClass.starts_at));
      title = `${subject.name} — ${studyClass.title || "zajęcia"} — ${date}`;
    } else {
      title = `${subject.name} — notatki`;
    }
  }

  const response = await googleApiFetch(
    user.id,
    "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
    {
      method: "POST",
      body: JSON.stringify({
        name: title,
        mimeType: "application/vnd.google-apps.document",
      }),
    }
  );
  const file = await response.json();
  if (!file.id) throw new Error("Google Drive nie zwrócił ID dokumentu.");

  const url = file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`;
  const { error } = await supabase.from("study_notes").insert({
    user_id: user.id,
    subject_id: subjectId,
    class_id: classId,
    title: file.name || title,
    google_file_id: file.id,
    url,
  });
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function deleteStudyNote(noteId: string, subjectId: string) {
  const { user } = await requirePermission("private.study");
  const supabase = await createClient();
  const { error } = await supabase.from("study_notes").delete().eq("id", noteId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}
