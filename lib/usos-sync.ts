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
    return `${provider}:group:${item.unit_id || "?"}:${item.group_number || "?"}:${day}`;
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

function relevantTermIds(data: any) {
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
  if (matching.length) return new Set(matching.map((term: any) => String(term.id)));
  return new Set(terms.slice(0, 2).map((term: any) => String(term.id)));
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

async function fetchTimetable(
  provider: UsosProvider,
  token: string,
  tokenSecret: string,
  start: Date,
  end: Date
) {
  const chunkStarts: Date[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    chunkStarts.push(new Date(cursor));
    cursor = addDays(cursor, 7);
  }

  const fields = [
    "type", "start_time", "end_time", "name", "url",
    "course_id", "course_name", "classtype_name", "lecturer_ids",
    "group_number", "building_name", "building_id", "room_number", "room_id",
    "unit_id", "classtype_id", "cgwm_id", "frequency", "sm_id", "slot_number",
  ].join("|");

  const results: any[] = [];
  for (let i = 0; i < chunkStarts.length; i += 4) {
    const batch = chunkStarts.slice(i, i + 4);
    const pages = await Promise.all(batch.map(async chunkStart => {
      const remaining = Math.floor((end.getTime() - chunkStart.getTime()) / 86_400_000) + 1;
      const days = Math.max(1, Math.min(7, remaining));
      return usosGetJson<any[]>(
        provider,
        "/services/tt/student",
        token,
        tokenSecret,
        {
          start: format(chunkStart, "yyyy-MM-dd"),
          days,
          fields,
        }
      );
    }));
    pages.forEach(page => {
      if (Array.isArray(page)) results.push(...page);
    });
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
    const activities = await fetchTimetable(
      provider,
      connection.access_token,
      connection.access_token_secret,
      start,
      end
    );

    const { data: existingClasses, error: classesReadError } = await admin
      .from("study_classes")
      .select("id,external_event_id,starts_at,attendance_status,notes")
      .eq("user_id", userId)
      .eq("source", `usos:${provider}`)
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString());
    if (classesReadError) throw new Error(classesReadError.message);

    const classesByExternal = new Map((existingClasses || []).map(row => [row.external_event_id, row]));
    const seen = new Set<string>();
    let insertedClasses = 0;
    let updatedClasses = 0;

    for (const item of activities) {
      if (!["classgroup", "classgroup2", "exam"].includes(String(item.type))) continue;
      const startAt = localUsosDateTime(item.start_time);
      const endAt = localUsosDateTime(item.end_time);
      if (!startAt) continue;

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
      seen.add(externalId);

      const payload = {
        user_id: userId,
        subject_id: subjectId,
        class_type: type,
        title: `${classCode(type)} - ${subjectDef.name}`,
        lecturer: [...subjectDef.lecturers].join(", ") || null,
        room: item.room_number ? String(item.room_number) : null,
        building: lang(item.building_name) || null,
        starts_at: startAt.toISOString(),
        ends_at: endAt?.toISOString() || null,
        source: `usos:${provider}`,
        source_provider: provider,
        external_event_id: externalId,
        external_unit_id: item.unit_id ? String(item.unit_id) : null,
        external_group_number: item.group_number !== undefined && item.group_number !== null ? String(item.group_number) : null,
        external_meeting_id: item.sm_id ? `sm:${item.sm_id}` : item.cgwm_id ? `cgwm:${item.cgwm_id}` : null,
        last_synced_at: new Date().toISOString(),
      };

      const existing = classesByExternal.get(externalId);
      if (existing) {
        const { error } = await admin
          .from("study_classes")
          .update(payload)
          .eq("id", existing.id)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
        updatedClasses += 1;
      } else {
        const { error } = await admin.from("study_classes").insert({
          ...payload,
          attendance_status: "unknown",
        });
        if (error) throw new Error(error.message);
        insertedClasses += 1;
      }
    }

    let cancelledClasses = 0;
    const now = new Date();
    for (const existing of existingClasses || []) {
      if (!existing.external_event_id || seen.has(existing.external_event_id)) continue;
      if (new Date(existing.starts_at) < now) continue;
      if (existing.attendance_status === "cancelled") continue;
      const { error } = await admin
        .from("study_classes")
        .update({
          attendance_status: "cancelled",
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      cancelledClasses += 1;
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
