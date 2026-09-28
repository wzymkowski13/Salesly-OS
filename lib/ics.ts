import { warsawLocalToUtc } from "@/lib/date";

type ParsedIcsEvent = {
  uid: string;
  summary: string;
  location?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  rrule?: string | null;
  exdates: Set<string>;
};

function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseLine(line: string) {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramsRaw] = left.split(";");
  const params: Record<string, string> = {};
  for (const part of paramsRaw) {
    const [key, ...rest] = part.split("=");
    if (key && rest.length) params[key.toUpperCase()] = rest.join("=");
  }
  return { name: name.toUpperCase(), params, value };
}

function parseIcsDate(value: string, params: Record<string, string>) {
  const raw = value.trim();
  if (/^\d{8}$/.test(raw)) return null;
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    const y = raw.slice(0,4), m = raw.slice(4,6), d = raw.slice(6,8);
    const hh = raw.slice(9,11), mm = raw.slice(11,13), ss = raw.slice(13,15);
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
  }
  if (/^\d{8}T\d{6}$/.test(raw)) {
    const y = raw.slice(0,4), m = raw.slice(4,6), d = raw.slice(6,8);
    const hh = raw.slice(9,11), mm = raw.slice(11,13);
    const tzid = params.TZID || "Europe/Warsaw";
    if (tzid === "Europe/Warsaw" || tzid === "Poland") return warsawLocalToUtc(`${y}-${m}-${d}`, `${hh}:${mm}`);
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:00`);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function durationMs(start: Date, end?: Date | null) {
  return end ? Math.max(0, end.getTime() - start.getTime()) : 90 * 60 * 1000;
}

function dateKey(date: Date) {
  return date.toISOString();
}

function parseRrule(rule?: string | null) {
  if (!rule) return null;
  const parts = Object.fromEntries(rule.split(";").map(part => {
    const [key, ...rest] = part.split("=");
    return [key.toUpperCase(), rest.join("=")];
  }));
  if (parts.FREQ !== "WEEKLY") return null;
  return {
    interval: Math.max(1, Number(parts.INTERVAL || 1)),
    count: parts.COUNT ? Math.max(1, Number(parts.COUNT)) : null,
    until: parts.UNTIL ? parseIcsDate(parts.UNTIL, {}) : null,
  };
}

export function parseStudyIcs(text: string, from: Date, to: Date) {
  const unfolded = unfoldIcs(text);
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  const output: Array<ParsedIcsEvent & { instanceStart: Date; instanceEnd?: Date | null; externalId: string }> = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    let uid = "";
    let summary = "Zajęcia";
    let location: string | null = null;
    let startsAt: Date | null = null;
    let endsAt: Date | null = null;
    let rrule: string | null = null;
    const exdates = new Set<string>();

    for (const rawLine of lines) {
      const parsed = parseLine(rawLine);
      if (!parsed) continue;
      if (parsed.name === "UID") uid = parsed.value.trim();
      if (parsed.name === "SUMMARY") summary = parsed.value.replace(/\\,/g, ",").replace(/\\n/g, " ").trim() || "Zajęcia";
      if (parsed.name === "LOCATION") location = parsed.value.replace(/\\,/g, ",").trim() || null;
      if (parsed.name === "DTSTART") startsAt = parseIcsDate(parsed.value, parsed.params);
      if (parsed.name === "DTEND") endsAt = parseIcsDate(parsed.value, parsed.params);
      if (parsed.name === "RRULE") rrule = parsed.value.trim();
      if (parsed.name === "EXDATE") {
        for (const item of parsed.value.split(",")) {
          const date = parseIcsDate(item, parsed.params);
          if (date) exdates.add(dateKey(date));
        }
      }
    }

    if (!uid || !startsAt) continue;
    const recurrence = parseRrule(rrule);
    const length = durationMs(startsAt, endsAt);

    if (!recurrence) {
      if (startsAt >= from && startsAt <= to && !exdates.has(dateKey(startsAt))) {
        output.push({
          uid, summary, location, startsAt, endsAt, rrule, exdates,
          instanceStart: startsAt,
          instanceEnd: endsAt,
          externalId: `${uid}:${startsAt.toISOString()}`,
        });
      }
      continue;
    }

    let current = new Date(startsAt);
    let occurrence = 1;
    const hardLimit = 500;
    while (current <= to && occurrence <= hardLimit) {
      const withinUntil = !recurrence.until || current <= recurrence.until;
      const withinCount = !recurrence.count || occurrence <= recurrence.count;
      if (!withinUntil || !withinCount) break;

      if (current >= from && !exdates.has(dateKey(current))) {
        output.push({
          uid, summary, location, startsAt, endsAt, rrule, exdates,
          instanceStart: new Date(current),
          instanceEnd: new Date(current.getTime() + length),
          externalId: `${uid}:${current.toISOString()}`,
        });
      }
      current = new Date(current.getTime() + recurrence.interval * 7 * 24 * 60 * 60 * 1000);
      occurrence += 1;
    }
  }

  return output;
}
