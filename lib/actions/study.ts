"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { warsawLocalToUtc } from "@/lib/date";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function optionalText(formData: FormData, key: string) {
  return textValue(formData, key) || null;
}

function optionalNumber(formData: FormData, key: string) {
  const raw = textValue(formData, key).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function revalidateStudy(subjectId?: string) {
  revalidatePath("/private");
  revalidatePath("/private/study");
  if (subjectId) revalidatePath(`/private/study/${subjectId}`);
}

export async function createStudySubject(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const payload = {
    user_id: user.id,
    name: textValue(formData, "name"),
    semester: optionalText(formData, "semester"),
    lecturer: optionalText(formData, "lecturer"),
    ects: optionalNumber(formData, "ects") ?? 0,
    pass_type: optionalText(formData, "pass_type"),
    pass_date: optionalText(formData, "pass_date"),
    pass_condition: optionalText(formData, "pass_condition"),
    final_grade: optionalNumber(formData, "final_grade"),
    notes: optionalText(formData, "notes"),
  };

  if (!payload.name) throw new Error("Nazwa przedmiotu jest wymagana.");
  const { error } = await supabase.from("study_subjects").insert(payload);
  if (error) throw new Error(error.message);
  revalidateStudy();
}

export async function updateStudySubject(subjectId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const payload = {
    name: textValue(formData, "name"),
    semester: optionalText(formData, "semester"),
    lecturer: optionalText(formData, "lecturer"),
    ects: optionalNumber(formData, "ects") ?? 0,
    pass_type: optionalText(formData, "pass_type"),
    pass_date: optionalText(formData, "pass_date"),
    pass_condition: optionalText(formData, "pass_condition"),
    final_grade: optionalNumber(formData, "final_grade"),
    notes: optionalText(formData, "notes"),
  };

  const { error } = await supabase.from("study_subjects").update(payload).eq("id", subjectId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function deleteStudySubject(subjectId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("study_subjects").delete().eq("id", subjectId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function createStudyClass(subjectId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const date = textValue(formData, "date");
  const startTime = textValue(formData, "start_time") || "09:00";
  const endTime = textValue(formData, "end_time");
  if (!date) throw new Error("Data zajęć jest wymagana.");

  const startsAt = warsawLocalToUtc(date, startTime);
  const endsAt = endTime ? warsawLocalToUtc(date, endTime) : null;

  const { error } = await supabase.from("study_classes").insert({
    user_id: user.id,
    subject_id: subjectId,
    class_type: textValue(formData, "class_type") || "lecture",
    title: optionalText(formData, "title"),
    lecturer: optionalText(formData, "lecturer"),
    room: optionalText(formData, "room"),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() || null,
    attendance_status: "unknown",
    notes: optionalText(formData, "notes"),
    source: "manual",
  });

  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function updateStudyClass(classId: string, subjectId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const date = textValue(formData, "date");
  const startTime = textValue(formData, "start_time") || "09:00";
  const endTime = textValue(formData, "end_time");
  const startsAt = warsawLocalToUtc(date, startTime);
  const endsAt = endTime ? warsawLocalToUtc(date, endTime) : null;

  const { error } = await supabase.from("study_classes").update({
    class_type: textValue(formData, "class_type") || "lecture",
    title: optionalText(formData, "title"),
    lecturer: optionalText(formData, "lecturer"),
    room: optionalText(formData, "room"),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() || null,
    notes: optionalText(formData, "notes"),
  }).eq("id", classId).eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function setStudyAttendance(classId: string, subjectId: string, status: "unknown"|"present"|"absent"|"cancelled") {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("study_classes").update({ attendance_status: status }).eq("id", classId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function deleteStudyClass(classId: string, subjectId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("study_classes").delete().eq("id", classId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function createStudyGrade(subjectId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const label = textValue(formData, "label");
  const grade = optionalNumber(formData, "grade");
  const weight = optionalNumber(formData, "weight") ?? 0;
  if (!label || grade === null) throw new Error("Nazwa i ocena są wymagane.");

  const { error } = await supabase.from("study_grades").insert({
    user_id: user.id,
    subject_id: subjectId,
    label,
    grade,
    weight,
    graded_at: optionalText(formData, "graded_at"),
    notes: optionalText(formData, "notes"),
  });

  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function updateStudyGrade(gradeId: string, subjectId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("study_grades").update({
    label: textValue(formData, "label"),
    grade: optionalNumber(formData, "grade"),
    weight: optionalNumber(formData, "weight") ?? 0,
    graded_at: optionalText(formData, "graded_at"),
    notes: optionalText(formData, "notes"),
  }).eq("id", gradeId).eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}

export async function deleteStudyGrade(gradeId: string, subjectId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("study_grades").delete().eq("id", gradeId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateStudy(subjectId);
}
