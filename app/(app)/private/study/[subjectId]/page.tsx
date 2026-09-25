import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, CalendarPlus, Check, CircleSlash2, GraduationCap, MapPin, Plus, UserRound, X } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createStudyClass,
  createStudyGrade,
  deleteStudyClass,
  deleteStudyGrade,
  setStudyAttendance,
  updateStudySubject,
} from "@/lib/actions/study";
import { FormDisclosure } from "@/components/form-disclosure";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value + "T12:00:00"));
}

function fmtDateTime(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateInWarsaw(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function timeInWarsaw(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

function classTypeLabel(value: string) {
  return value === "lecture" ? "Wykład" : value === "exercise" ? "Ćwiczenia" : value === "lab" ? "Laboratorium" : value === "seminar" ? "Seminarium" : "Inne";
}

function attendanceBadge(status: string) {
  if (status === "present") return <Badge variant="green">Obecny</Badge>;
  if (status === "absent") return <Badge variant="red">Nieobecny</Badge>;
  if (status === "cancelled") return <Badge variant="neutral">Odwołane</Badge>;
  return <Badge variant="blue">Nieoznaczone</Badge>;
}

export default async function StudySubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const user = await requireUser();
  const { subjectId } = await params;
  const supabase = await createClient();

  const [{ data: subject }, { data: classes }, { data: grades }] = await Promise.all([
    supabase.from("study_subject_summary").select("*").eq("id", subjectId).eq("user_id", user.id).maybeSingle(),
    supabase.from("study_classes").select("*").eq("subject_id", subjectId).eq("user_id", user.id).order("starts_at", { ascending: true }).limit(200),
    supabase.from("study_grades").select("*").eq("subject_id", subjectId).eq("user_id", user.id).order("graded_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
  ]);

  if (!subject) notFound();

  const today = dateInWarsaw(new Date().toISOString());
  const upcoming = (classes || []).filter((item: any) => dateInWarsaw(item.starts_at) >= today);
  const past = (classes || []).filter((item: any) => dateInWarsaw(item.starts_at) < today).reverse();

  const editForm = <form action={updateStudySubject.bind(null, subjectId)} className="grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przedmiot</label><Input name="name" required defaultValue={subject.name}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Semestr</label><Input name="semester" defaultValue={subject.semester || ""}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Prowadzący</label><Input name="lecturer" defaultValue={subject.lecturer || ""}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">ECTS</label><Input name="ects" type="number" min="0" step="0.5" defaultValue={subject.ects || 0}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Forma zaliczenia</label><Select name="pass_type" defaultValue={subject.pass_type || ""}><option value="">— wybierz —</option><option value="Egzamin">Egzamin</option><option value="Zaliczenie">Zaliczenie</option><option value="Projekt">Projekt</option><option value="Inne">Inne</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Termin zaliczenia</label><Input name="pass_date" type="date" defaultValue={subject.pass_date || ""}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Ocena końcowa</label><Input name="final_grade" type="number" min="1" max="6" step="0.5" defaultValue={subject.final_grade || ""}/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Warunek zaliczenia</label><Textarea name="pass_condition" rows={3} defaultValue={subject.pass_condition || ""}/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatki</label><Textarea name="notes" rows={3} defaultValue={subject.notes || ""}/></div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit">Zapisz zmiany</Button></div>
  </form>;

  const addClassForm = <form action={createStudyClass.bind(null, subjectId)} className="grid gap-4 md:grid-cols-2">
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label><Input name="date" type="date" required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ zajęć</label><Select name="class_type" defaultValue="lecture"><option value="lecture">Wykład</option><option value="exercise">Ćwiczenia</option><option value="lab">Laboratorium</option><option value="seminar">Seminarium</option><option value="other">Inne</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Od</label><TimePicker name="start_time" defaultValue="09:00" required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Do</label><TimePicker name="end_time" optional/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Sala</label><Input name="room"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Prowadzący</label><Input name="lecturer" defaultValue={subject.lecturer || ""}/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Tytuł / temat</label><Input name="title" placeholder="Opcjonalnie, np. Wykład 4 — regresja"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatka</label><Textarea name="notes" rows={3}/></div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit"><CalendarPlus size={15}/> Dodaj zajęcia</Button></div>
  </form>;

  const addGradeForm = <form action={createStudyGrade.bind(null, subjectId)} className="grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Element</label><Input name="label" required placeholder="Np. Kolokwium 1"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Ocena</label><Input name="grade" type="number" min="1" max="6" step="0.5" required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Waga (%)</label><Input name="weight" type="number" min="0" max="100" step="0.5" defaultValue="0"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label><Input name="graded_at" type="date"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatka</label><Textarea name="notes" rows={2}/></div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit"><Plus size={15}/> Dodaj ocenę</Button></div>
  </form>;

  return <div className="space-y-7">
    <div>
      <Link href="/private/study" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b7d8a] hover:text-[#3f6fd0]"><ArrowLeft size={15}/> Studia</Link>
      <SectionHeader
        title={subject.name}
        action={<div className="flex gap-2"><FormDisclosure label="Edytuj" variant="secondary" align="right">{editForm}</FormDisclosure><FormDisclosure label="Dodaj zajęcia" align="right">{addClassForm}</FormDisclosure></div>}
      />
      <div className="-mt-4 flex flex-wrap gap-2 text-sm text-[#75848f]">
        {subject.semester && <span>{subject.semester}</span>}
        {subject.lecturer && <><span>·</span><span>{subject.lecturer}</span></>}
        <span>·</span><span>{Number(subject.ects || 0)} ECTS</span>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Frekwencja" value={subject.attendance_pct === null ? "—" : `${subject.attendance_pct}%`} hint={`${subject.present_count || 0} obecności · ${subject.absent_count || 0} nieobecności`} icon={Check} tone="green"/>
      <StatCard label="Średnia ważona" value={subject.weighted_average ?? "—"} hint={`wagi: ${Number(subject.weight_total || 0)}%`} icon={GraduationCap} tone="blue"/>
      <StatCard label="Zaliczenie" value={subject.final_grade ?? "—"} hint={subject.pass_type || "brak formy"} icon={BookOpenCheck} tone="slate"/>
      <StatCard label="Termin" value={subject.pass_date ? fmtDate(subject.pass_date) : "—"} hint="zaliczenia" icon={CalendarPlus} tone="amber"/>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card>
        <CardHeader>
          <div><h2 className="font-bold text-[#2a3944]">Plan zajęć</h2><div className="text-xs text-[#83909b]">obecność liczona automatycznie per przedmiot</div></div>
          <FormDisclosure label="Dodaj zajęcia" compact variant="secondary" align="right">{addClassForm}</FormDisclosure>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8c99a4]">Nadchodzące</div>
            <div className="space-y-2">
              {upcoming.map((item: any) => <div key={item.id} className="rounded-2xl border border-[#e3e9ef] bg-[#fbfcfe] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><div className="font-bold text-[#32424d]">{item.title || classTypeLabel(item.class_type)}</div>{attendanceBadge(item.attendance_status)}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#81909b]"><span>{fmtDateTime(item.starts_at)}{item.ends_at ? ` – ${timeInWarsaw(item.ends_at)}` : ""}</span>{item.room && <span className="inline-flex items-center gap-1"><MapPin size={12}/>{item.room}</span>}{item.lecturer && <span className="inline-flex items-center gap-1"><UserRound size={12}/>{item.lecturer}</span>}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <form action={setStudyAttendance.bind(null, item.id, subjectId, "present")}><Button size="sm" variant={item.attendance_status === "present" ? "primary" : "soft"}><Check size={14}/> Obecny</Button></form>
                    <form action={setStudyAttendance.bind(null, item.id, subjectId, "absent")}><Button size="sm" variant={item.attendance_status === "absent" ? "danger" : "secondary"}><X size={14}/> Nieobecny</Button></form>
                    <form action={setStudyAttendance.bind(null, item.id, subjectId, "cancelled")}><Button size="sm" variant="ghost"><CircleSlash2 size={14}/> Odwołane</Button></form>
                    <form action={deleteStudyClass.bind(null, item.id, subjectId)}><Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">Usuń</Button></form>
                  </div>
                </div>
              </div>)}
              {!upcoming.length && <EmptyState title="Brak nadchodzących zajęć" description="Dodaj plan ręcznie lub później zsynchronizujemy go z Google Calendar / ICS."/>}
            </div>
          </div>

          {past.length > 0 && <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8c99a4]">Historia</div>
            <div className="space-y-2">
              {past.slice(0, 20).map((item: any) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[#edf1f5] px-3 py-3 md:flex-row md:items-center md:justify-between">
                <div><div className="flex items-center gap-2 text-sm font-semibold text-[#40515d]">{item.title || classTypeLabel(item.class_type)} {attendanceBadge(item.attendance_status)}</div><div className="mt-1 text-xs text-[#8996a0]">{fmtDateTime(item.starts_at)}</div></div>
                <div className="flex gap-1.5">
                  <form action={setStudyAttendance.bind(null, item.id, subjectId, "present")}><Button size="sm" variant="soft">Obecny</Button></form>
                  <form action={setStudyAttendance.bind(null, item.id, subjectId, "absent")}><Button size="sm" variant="secondary">Nieobecny</Button></form>
                  <form action={setStudyAttendance.bind(null, item.id, subjectId, "cancelled")}><Button size="sm" variant="ghost">Odwołane</Button></form>
                </div>
              </div>)}
            </div>
          </div>}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader><div><h2 className="font-bold text-[#2a3944]">Zaliczenie</h2><div className="text-xs text-[#83909b]">warunki i termin</div></div></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-xs text-[#8996a0]">Forma</div><div className="mt-1 font-semibold text-[#40515d]">{subject.pass_type || "—"}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-xs text-[#8996a0]">Termin</div><div className="mt-1 font-semibold text-[#40515d]">{fmtDate(subject.pass_date)}</div></div>
            </div>
            <div className="rounded-xl border border-[#e7ecf2] p-3"><div className="text-xs font-semibold text-[#8996a0]">Warunek</div><div className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#536674]">{subject.pass_condition || "Brak wpisanego warunku zaliczenia."}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div><h2 className="font-bold text-[#2a3944]">Oceny cząstkowe</h2><div className="text-xs text-[#83909b]">średnia liczona według wag</div></div>
            <FormDisclosure label="Dodaj ocenę" compact align="right">{addGradeForm}</FormDisclosure>
          </CardHeader>
          <CardContent className="space-y-2">
            {(grades || []).map((grade: any) => <div key={grade.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3">
              <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#40515d]">{grade.label}</div><div className="mt-0.5 text-xs text-[#8996a0]">{grade.graded_at ? fmtDate(grade.graded_at) : "bez daty"} · waga {Number(grade.weight || 0)}%</div></div>
              <div className="flex items-center gap-2"><div className="rounded-xl bg-[#edf3ff] px-3 py-1.5 text-sm font-bold text-[#416fc9]">{Number(grade.grade)}</div><form action={deleteStudyGrade.bind(null, grade.id, subjectId)}><Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">Usuń</Button></form></div>
            </div>)}
            {!(grades || []).length && <EmptyState title="Brak ocen" description="Dodaj oceny i wagi, a średnia policzy się automatycznie."/>}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>;
}
