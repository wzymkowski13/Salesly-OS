import { addDays, format, isAfter, isBefore, parseISO, subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { warsawLocalToUtc } from "@/lib/date";
import {
  getUsosConnectionWithSecrets,
  type UsosProvider,
  usosGetJson,
} from "@/lib/usos";

type LangDict = string | { pl?: string; en?: string } | null | undefined;

function lang(value: LangDict) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.pl || value.en || "";
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function personName(person: any) {
  if (!person) return "";
  if (person.name) return lang(person.name);
  if (person.full_name) return String(person.full_name);
  const first = person.first_name || person.first_names || "";
  const last = person.last_name || "";
  return `${first} ${last}`.trim();
}

function classType(value: string) {
  const text = normalize(value);
  if (text.includes("wyklad") || text === "wyk") return "lecture";
  if (text.includes("cwicz") || text === "cw") return "exercise";
  if (text.includes("labor") || text === "lab") return "lab";
  if (text.includes("semin")) return "seminar";
  if (text.includes("warsztat") || text === "war") return "workshop";
  return "other";
}

function classCode(type: string) {
  if (type === "lecture") return "WYK";
  if (type === "exercise") return "ĆW";
  if (type === "lab") return "LAB";
  if (type === "seminar") return "SEM";
  if (type === "workshop") return "WAR";
  return "ZAJ";
}

function localUsosDateTime(value: string) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (!match) return null;
  return warsawLocalToUtc(match[1], match[2]);
}

function dateOnly(value: string) {
  return String(value || "").slice(0, 10);
}

function groupKey(unitId: unknown, groupNumber: unknown) {
  return `${String(unitId || "")}|${String(groupNumber || "")}`;
}

function activityExternalId(provider: UsosProvider, item: any) {
  const day = dateOnly(item.start_time);
  if (item.type === "classgroup2" && item.sm_id) return `${provider}:sm:${item.sm_id}`;
  if (item.cgwm_id) return `${provider}:cgwm:${item.cgwm_id}:${day}`;
  if (item.unit_id || item.group_number) {
    return `${provider}:group:${item.unit_id || "?"}:${item.group_number || "?"}:${day}:${String(item.start_time || "").slice(11, 16)}`;
  }
  if (item.type === "exam" && item.course_id) {
    return `${provider}:exam:${item.course_id}:${day}:${String(item.start_time || "").slice(11, 16)}`;
  }
  return `${provider}:${item.type || "activity"}:${item.course_id || "unknown"}:${day}:${String(item.start_time || "").slice(11, 16)}`;
}

function termDate(term: any, key: "start_date" | "end_date") {
  const value = term?.[key];
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : null;
}

function relevantTermIds(data: any): Set<string> {
  const terms = Array.isArray(data?.terms) ? data.terms : [];
  const now = new Date();
  const low = subDays(now, 45);
  const high = addDays(now, 220);
  const matching = terms.filter((term: any) => {
    const start = termDate(term, "start_date");
    const end = termDate(term, "end_date");
    if (!start || !end) return false;
    return !isBefore(end, low) && !isAfter(start, high);
  });
  if (matching.length) return new Set<string>(matching.map((term: any) => String(term.id)));
  return new Set<string>(terms.slice(0, 2).map((term: any) => String(term.id)));
}

function syncWindow(data: any, selectedTerms: Set<string>) {
  const terms = (Array.isArray(data?.terms) ? data.terms : []).filter((term: any) => selectedTerms.has(String(term.id)));
  const starts = terms.map((term: any) => termDate(term, "start_date")).filter(Boolean) as Date[];
  const ends = terms.map((term: any) => termDate(term, "end_date")).filter(Boolean) as Date[];
  const fallbackStart = subDays(new Date(), 30);
  const fallbackEnd = addDays(new Date(), 190);
  let start = starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : fallbackStart;
  let end = ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : fallbackEnd;

  const hardStart = subDays(new Date(), 60);
  const hardEnd = addDays(new Date(), 240);
  if (start < hardStart) start = hardStart;
  if (end > hardEnd) end = hardEnd;
  return { start, end };
}

async function fetchTimetableFromGroups(
  provider: UsosProvider,
  token: string,
  tokenSecret: string,
  groups: Array<any & { _termId: string }>
) {
  const fields = [
    "type", "start_time", "end_time", "name",
    "course_id", "course_name", "classtype_name",
    "group_number", "building_name", "room_number",
    "unit_id", "cgwm_id", "frequency", "sm_id",
  ].join("|");

  const identities = new Map<string, { unitId: string; groupNumber: string }>();
  for (const group of groups) {
    const unitId = String(group.course_unit_id || "");
    const groupNumber = String(group.group_number ?? "");
    if (!unitId || !groupNumber) continue;
    identities.set(`${unitId}|${groupNumber}`, { unitId, groupNumber });
  }

  const all: any[] = [];
  const uniqueGroups = [...identities.values()];

  // classgroup_dates2 has no seven-day workspan limit and is substantially more
  // reliable on installations where tt/student occasionally returns HTTP 500.
  for (let i = 0; i < uniqueGroups.length; i += 8) {
    const batch = uniqueGroups.slice(i, i + 8);
    const results = await Promise.allSettled(batch.map(async group => {
      const page = await usosGetJson<any[]>(
        provider,
        "/services/tt/classgroup_dates2",
        token,
        tokenSecret,
        {
          unit_id: group.unitId,
          group_number: group.groupNumber,
          fields,
        }
      );
      return { group, page };
    }));

    for (const result of results) {
      if (result.status !== "fulfilled" || !Array.isArray(result.value.page)) continue;
      for (const item of result.value.page) {
        // Older USOS installations may omit these identifiers even though
        // they are known from the class-group request.
        all.push({
          ...item,
          unit_id: item?.unit_id ?? result.value.group.unitId,
          group_number: item?.group_number ?? result.value.group.groupNumber,
        });
      }
    }
  }

  const unique = new Map<string, any>();
  for (const item of all) {
    if (!item?.start_time) continue;
    unique.set(activityExternalId(provider, item), item);
  }
  return [...unique.values()];
}

async function fetchExamActivitiesBestEffort(
  provider: UsosProvider,
  token: string,
  tokenSecret: string,
  start: Date,
  end: Date
) {
  const results: any[] = [];
  let cursor = new Date(start);

  // Exams are supplementary. A broken tt/student must never block the class
  // timetable, so every weekly request is best-effort.
  while (cursor <= end) {
    const remaining = Math.floor((end.getTime() - cursor.getTime()) / 86_400_000) + 1;
    const days = Math.max(1, Math.min(7, remaining));
    try {
      const page = await usosGetJson<any[]>(
        provider,
        "/services/tt/student",
        token,
        tokenSecret,
        {
          start: format(cursor, "yyyy-MM-dd"),
          days,
          fields: "type|start_time|end_time|name|course_id|course_name|group_number|building_name|room_number",
        }
      );
      if (Array.isArray(page)) results.push(...page.filter(item => item?.type === "exam"));
    } catch {
      // UJD currently sometimes returns HTTP 500 from tt/student.
      // Classes still sync from classgroup_dates2.
    }
    cursor = addDays(cursor, 7);
  }

  const unique = new Map<string, any>();
  for (const item of results) {
    if (!item?.start_time) continue;
    unique.set(activityExternalId(provider, item), item);
  }
  return [...unique.values()];
}

export async function syncUsosForUser(userId: string) {
  const admin = createAdminClient();
  const connection = await getUsosConnectionWithSecrets(userId);
  if (!connection) throw new Error("USOS nie jest podłączony.");

  const provider = connection.provider as UsosProvider;
  const { data: run, error: runError } = await admin
    .from("usos_sync_runs")
    .insert({ user_id: userId, provider, status: "running" })
    .select("id")
    .single();
  if (runError) throw new Error(runError.message);

  try {
    const groupsData = await usosGetJson<any>(
      provider,
      "/services/groups/participant",
      connection.access_token,
      connection.access_token_secret,
      {
        fields: "course_unit_id|group_number|class_type|class_type_id|course_id|course_name|term_id|lecturers",
        lang: "pl",
        active_terms: "false",
      }
    );

    const selectedTerms = relevantTermIds(groupsData);
    const termLookup = new Map<string, any>();
    for (const term of Array.isArray(groupsData?.terms) ? groupsData.terms : []) {
      termLookup.set(String(term.id), term);
    }

    let ectsData: Record<string, Record<string, string | null>> = {};
    try {
      ectsData = await usosGetJson(
        provider,
        "/services/courses/user_ects_points",
        connection.access_token,
        connection.access_token_secret
      );
    } catch {}

    const rawGroups: Array<any & { _termId: string }> = [];
    const groupsByTerm = groupsData?.groups && typeof groupsData.groups === "object" ? groupsData.groups : {};
    for (const [termId, groups] of Object.entries(groupsByTerm)) {
      if (!selectedTerms.has(String(termId)) || !Array.isArray(groups)) continue;
      for (const group of groups) rawGroups.push({ ...(group as any), _termId: String(termId) });
    }

    const subjectDefs = new Map<string, {
      courseId: string;
      termId: string;
      name: string;
      lecturers: Set<string>;
      ects: number;
      semester: string;
    }>();

    const unitToSubjectKey = new Map<string, string>();
    const groupToSubjectKey = new Map<string, string>();

    for (const group of rawGroups) {
      const courseId = String(group.course_id || "");
      const termId = String(group.term_id || group._termId || "");
      if (!courseId || !termId) continue;
      const key = `${termId}|${courseId}`;
      const term = termLookup.get(termId);
      const termName = lang(term?.name) || termId;
      const ectsRaw = ectsData?.[termId]?.[courseId];
      const ects = ectsRaw !== null && ectsRaw !== undefined && Number.isFinite(Number(ectsRaw)) ? Number(ectsRaw) : 0;

      if (!subjectDefs.has(key)) {
        subjectDefs.set(key, {
          courseId,
          termId,
          name: lang(group.course_name) || courseId,
          lecturers: new Set<string>(),
          ects,
          semester: termName,
        });
      }
      const def = subjectDefs.get(key)!;
      for (const lecturer of Array.isArray(group.lecturers) ? group.lecturers : []) {
        const name = personName(lecturer);
        if (name) def.lecturers.add(name);
      }

      const unitId = String(group.course_unit_id || "");
      const number = String(group.group_number || "");
      if (unitId) unitToSubjectKey.set(unitId, key);
      if (unitId || number) groupToSubjectKey.set(groupKey(unitId, number), key);
    }

    const { data: existingSubjects, error: subjectsReadError } = await admin
      .from("study_subjects")
      .select("id,name,source,source_provider,external_course_id,external_term_id,lecturer,ects,semester")
      .eq("user_id", userId)
      .is("archived_at", null);
    if (subjectsReadError) throw new Error(subjectsReadError.message);

    const existingByExternal = new Map<string, any>();
    const availableManualByName = new Map<string, any>();
    for (const subject of existingSubjects || []) {
      if (subject.external_course_id && subject.external_term_id && subject.source_provider) {
        existingByExternal.set(
          `${subject.source_provider}|${subject.external_term_id}|${subject.external_course_id}`,
          subject
        );
      } else {
        availableManualByName.set(normalize(subject.name), subject);
      }
    }

    const subjectIds = new Map<string, string>();
    let createdSubjects = 0;

    for (const [key, def] of subjectDefs) {
      const extKey = `${provider}|${def.termId}|${def.courseId}`;
      const exact = existingByExternal.get(extKey);
      const manual = !exact ? availableManualByName.get(normalize(def.name)) : null;
      const lecturer = [...def.lecturers].join(", ") || null;
      const updatePayload = {
        name: def.name,
        semester: def.semester,
        lecturer,
        ects: def.ects,
        source: "usos",
        source_provider: provider,
        external_course_id: def.courseId,
        external_term_id: def.termId,
        last_synced_at: new Date().toISOString(),
      };

      if (exact || manual) {
        const target = exact || manual;
        const { error } = await admin.from("study_subjects").update({
          ...updatePayload,
          lecturer: lecturer || target.lecturer,
          ects: def.ects || Number(target.ects || 0),
          semester: def.semester || target.semester,
        }).eq("id", target.id).eq("user_id", userId);
        if (error) throw new Error(error.message);
        subjectIds.set(key, target.id);
        if (manual) availableManualByName.delete(normalize(def.name));
      } else {
        const { data: inserted, error } = await admin
          .from("study_subjects")
          .insert({ user_id: userId, ...updatePayload })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        subjectIds.set(key, inserted.id);
        createdSubjects += 1;
      }
    }

    const { start, end } = syncWindow(groupsData, selectedTerms);
    // Main sync intentionally uses classgroup_dates2 only. UJD's tt/student
    // currently returns intermittent HTTP 500 responses and made the whole
    // request slow enough to hit function timeouts. Exams can be added later
    // as a separate best-effort sync without blocking the class timetable.
    const activities = await fetchTimetableFromGroups(
      provider,
      connection.access_token,
      connection.access_token_secret,
      rawGroups
    );

    // Read every previously synced USOS class for this provider, not just the
    // current date window. classgroup_dates2 returns complete group history,
    // so a windowed lookup could miss an existing row and attempt a duplicate insert.
    const { data: existingClasses, error: classesReadError } = await admin
      .from("study_classes")
      .select("id,subject_id,class_type,external_event_id,starts_at,ends_at,attendance_status,notes")
      .eq("user_id", userId)
      .eq("source", `usos:${provider}`);
    if (classesReadError) throw new Error(classesReadError.message);

    const classesByExternal = new Map(
      (existingClasses || [])
        .filter(row => row.external_event_id)
        .map(row => [row.external_event_id as string, row])
    );

    // Build one row per external event before touching the database. This makes
    // repeated and concurrent syncs idempotent and avoids N individual writes.
    const rowsByExternal = new Map<string, any>();

    for (const item of activities) {
      if (!["classgroup", "classgroup2"].includes(String(item.type))) continue;
      const startAt = localUsosDateTime(item.start_time);
      const endAt = localUsosDateTime(item.end_time);
      if (!startAt) continue;
      if (startAt < start || startAt > end) continue;

      let subjectKey = groupToSubjectKey.get(groupKey(item.unit_id, item.group_number));
      if (!subjectKey && item.unit_id) subjectKey = unitToSubjectKey.get(String(item.unit_id));
      if (!subjectKey && item.course_id) {
        subjectKey = [...subjectDefs.keys()].find(key => key.endsWith(`|${String(item.course_id)}`));
      }
      if (!subjectKey) continue;

      const subjectId = subjectIds.get(subjectKey);
      const subjectDef = subjectDefs.get(subjectKey);
      if (!subjectId || !subjectDef) continue;

      const type = classType(lang(item.classtype_name) || lang(item.name));
      const externalId = activityExternalId(provider, item);
      const existing = classesByExternal.get(externalId);

      rowsByExternal.set(externalId, {
        user_id: userId,
        subject_id: subjectId,
        class_type: type,
        title: `${classCode(type)} - ${subjectDef.name}`,
        lecturer: [...subjectDef.lecturers].join(", ") || null,
        room: item.room_number ? String(item.room_number) : null,
        building: lang(item.building_name) || null,
        starts_at: startAt.toISOString(),
        ends_at: endAt?.toISOString() || null,
        attendance_status: existing?.attendance_status || "unknown",
        notes: existing?.notes || null,
        source: `usos:${provider}`,
        source_provider: provider,
        external_event_id: externalId,
        external_unit_id: item.unit_id ? String(item.unit_id) : null,
        external_group_number: item.group_number !== undefined && item.group_number !== null ? String(item.group_number) : null,
        external_meeting_id: item.sm_id ? `sm:${item.sm_id}` : item.cgwm_id ? `cgwm:${item.cgwm_id}` : null,
        last_synced_at: new Date().toISOString(),
      });
    }

    const upsertRows = [...rowsByExternal.values()];
    for (let i = 0; i < upsertRows.length; i += 100) {
      const chunk = upsertRows.slice(i, i + 100);
      const { error } = await admin
        .from("study_classes")
        .upsert(chunk, { onConflict: "user_id,source,external_event_id" });
      if (error) throw new Error(error.message);
    }

    // Reconcile legacy USOS rows created with an older external-id scheme.
    // The physical identity of a class block is subject + class type + start time.
    // If the same block exists under an old external ID, move user-owned links
    // (notes/grades) to the canonical row and remove the stale duplicate.
    const physicalKey = (row: { subject_id?: string | null; class_type?: string | null; starts_at?: string | null }) =>
      [String(row.subject_id || ""), String(row.class_type || ""), new Date(String(row.starts_at || "")).toISOString()].join("|");

    const incomingByPhysical = new Map<string, any>();
    for (const row of upsertRows) incomingByPhysical.set(physicalKey(row), row);

    if (incomingByPhysical.size) {
      const { data: refreshedRows, error: refreshError } = await admin
        .from("study_classes")
        .select("id,subject_id,class_type,external_event_id,starts_at,attendance_status,notes,source")
        .eq("user_id", userId)
        .eq("source", `usos:${provider}`);
      if (refreshError) throw new Error(refreshError.message);

      const canonicalByPhysical = new Map<string, any>();
      for (const row of refreshedRows || []) {
        const incoming = incomingByPhysical.get(physicalKey(row));
        if (incoming && row.external_event_id === incoming.external_event_id) {
          canonicalByPhysical.set(physicalKey(row), row);
        }
      }

      for (const stale of refreshedRows || []) {
        const key = physicalKey(stale);
        const canonical = canonicalByPhysical.get(key);
        if (!canonical || canonical.id === stale.id) continue;
        if (stale.external_event_id === canonical.external_event_id) continue;

        // Preserve attendance/notes if they only existed on the legacy row.
        const classPatch: Record<string, any> = {};
        if (canonical.attendance_status === "unknown" && stale.attendance_status && stale.attendance_status !== "cancelled") {
          classPatch.attendance_status = stale.attendance_status;
        }
        if (!canonical.notes && stale.notes) classPatch.notes = stale.notes;
        if (Object.keys(classPatch).length) {
          const { error } = await admin.from("study_classes").update(classPatch).eq("id", canonical.id).eq("user_id", userId);
          if (error) throw new Error(error.message);
        }

        const { error: noteMoveError } = await admin
          .from("study_notes")
          .update({ class_id: canonical.id })
          .eq("user_id", userId)
          .eq("class_id", stale.id);
        if (noteMoveError) throw new Error(noteMoveError.message);

        const { error: gradeMoveError } = await admin
          .from("study_grades")
          .update({ class_id: canonical.id })
          .eq("user_id", userId)
          .eq("class_id", stale.id);
        if (gradeMoveError) throw new Error(gradeMoveError.message);

        const { error: deleteLegacyError } = await admin
          .from("study_classes")
          .delete()
          .eq("id", stale.id)
          .eq("user_id", userId);
        if (deleteLegacyError) throw new Error(deleteLegacyError.message);
      }
    }

    const seen = new Set(rowsByExternal.keys());
    const insertedClasses = [...seen].filter(id => !classesByExternal.has(id)).length;
    const updatedClasses = seen.size - insertedClasses;

    // Mark only future rows from the active sync window as cancelled. Historical
    // attendance and rows from another term are left untouched.
    const now = new Date();
    const cancelIds = (existingClasses || [])
      .filter(existing =>
        existing.external_event_id &&
        !seen.has(existing.external_event_id) &&
        new Date(existing.starts_at) >= now &&
        new Date(existing.starts_at) >= start &&
        new Date(existing.starts_at) <= end &&
        existing.attendance_status !== "cancelled"
      )
      .map(existing => existing.id);

    let cancelledClasses = 0;
    for (let i = 0; i < cancelIds.length; i += 100) {
      const chunk = cancelIds.slice(i, i + 100);
      const { error } = await admin
        .from("study_classes")
        .update({
          attendance_status: "cancelled",
          last_synced_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .in("id", chunk);
      if (error) throw new Error(error.message);
      cancelledClasses += chunk.length;
    }

    const summary = {
      subjects: subjectDefs.size,
      subjects_created: createdSubjects,
      classes: seen.size,
      classes_created: insertedClasses,
      classes_updated: updatedClasses,
      classes_cancelled: cancelledClasses,
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };

    const finishedAt = new Date().toISOString();
    await admin.from("usos_connections").update({
      last_sync_at: finishedAt,
      last_sync_status: "success",
      last_sync_summary: summary,
    }).eq("user_id", userId);

    await admin.from("usos_sync_runs").update({
      status: "success",
      subjects_count: subjectDefs.size,
      classes_count: seen.size,
      updated_count: updatedClasses,
      cancelled_count: cancelledClasses,
      finished_at: finishedAt,
    }).eq("id", run.id);

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd synchronizacji USOS.";
    const finishedAt = new Date().toISOString();
    await admin.from("usos_connections").update({
      last_sync_at: finishedAt,
      last_sync_status: "error",
      last_sync_summary: { error: message },
    }).eq("user_id", userId);
    await admin.from("usos_sync_runs").update({
      status: "error",
      error_message: message.slice(0, 1000),
      finished_at: finishedAt,
    }).eq("id", run.id);
    throw error;
  }
}
