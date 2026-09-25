import Link from "next/link";
import { BookOpenCheck, CalendarClock, GraduationCap, Plus, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createStudySubject } from "@/lib/actions/study";
import { FormDisclosure } from "@/components/form-disclosure";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function classTypeLabel(value: string) {
  return value === "lecture" ? "Wykład" : value === "exercise" ? "Ćwiczenia" : value === "lab" ? "Laboratorium" : value === "seminar" ? "Seminarium" : "Inne";
}

export default async function StudyPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const [{ data: subjects }, { data: upcoming }, { data: exams }] = await Promise.all([
    supabase.from("study_subject_summary").select("*").eq("user_id", user.id).is("archived_at", null).order("name"),
    supabase.from("study_classes").select("id,subject_id,class_type,title,room,starts_at,ends_at,attendance_status,study_subjects(name)").eq("user_id", user.id).gte("starts_at", now).order("starts_at").limit(8),
    supabase.from("study_subjects").select("id,name,pass_type,pass_date").eq("user_id", user.id).is("archived_at", null).gte("pass_date", today).order("pass_date").limit(8),
  ]);

  const activeSubjects = subjects || [];
  const totalEcts = activeSubjects.reduce((sum: number, subject: any) => sum + Number(subject.ects || 0), 0);
  const present = activeSubjects.reduce((sum: number, subject: any) => sum + Number(subject.present_count || 0), 0);
  const absent = activeSubjects.reduce((sum: number, subject: any) => sum + Number(subject.absent_count || 0), 0);
  const attendance = present + absent > 0 ? Math.round((present / (present + absent)) * 1000) / 10 : null;

  const addSubjectForm = <form action={createStudySubject} className="grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przedmiot</label><Input name="name" required placeholder="Np. Ekonometria"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Semestr</label><Input name="semester" placeholder="Np. I semestr 2026/27"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Prowadzący</label><Input name="lecturer" placeholder="Imię i nazwisko"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">ECTS</label><Input name="ects" type="number" min="0" step="0.5" defaultValue="0"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Forma zaliczenia</label><Select name="pass_type" defaultValue=""><option value="">— wybierz —</option><option value="Egzamin">Egzamin</option><option value="Zaliczenie">Zaliczenie</option><option value="Projekt">Projekt</option><option value="Inne">Inne</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Termin zaliczenia</label><Input name="pass_date" type="date"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Ocena końcowa</label><Input name="final_grade" type="number" min="1" max="6" step="0.5"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Warunek zaliczenia</label><Textarea name="pass_condition" rows={3} placeholder="Np. min. 50% z egzaminu + projekt"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatki</label><Textarea name="notes" rows={3}/></div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit"><Plus size={15}/> Dodaj przedmiot</Button></div>
  </form>;

  return <div className="space-y-7">
    <SectionHeader
      title="Studia"
      action={<FormDisclosure label="Dodaj przedmiot" align="right">{addSubjectForm}</FormDisclosure>}
    />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Przedmioty" value={activeSubjects.length} hint="aktywnych" icon={BookOpenCheck} tone="blue"/>
      <StatCard label="ECTS" value={totalEcts} hint="w aktywnych przedmiotach" icon={GraduationCap} tone="slate"/>
      <StatCard label="Frekwencja" value={attendance === null ? "—" : `${attendance}%`} hint={attendance === null ? "brak oznaczonych zajęć" : `${present} obecności · ${absent} nieobecności`} icon={Trophy} tone="green"/>
      <StatCard label="Najbliższe zajęcia" value={(upcoming || []).length} hint="w podglądzie" icon={CalendarClock} tone="amber"/>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card>
        <CardHeader>
          <div><h2 className="font-bold text-[#2a3944]">Przedmioty</h2><div className="text-xs text-[#83909b]">Oceny, frekwencja, zaliczenia i ECTS</div></div>
        </CardHeader>
        <CardContent>
          {activeSubjects.length ? <div className="grid gap-3 md:grid-cols-2">
            {activeSubjects.map((subject: any) => <Link key={subject.id} href={`/private/study/${subject.id}`} className="group rounded-2xl border border-[#e2e8ef] bg-[#fbfcfe] p-4 transition-all hover:-translate-y-0.5 hover:border-[#cfdced] hover:bg-white hover:shadow-[0_10px_28px_rgba(31,48,65,.07)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-bold text-[#30404b]">{subject.name}</div>
                  <div className="mt-1 text-xs text-[#81909b]">{subject.lecturer || "Brak prowadzącego"}{subject.semester ? ` · ${subject.semester}` : ""}</div>
                </div>
                <Badge variant="blue">{Number(subject.ects || 0)} ECTS</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#e8edf2]"><div className="text-[#8a98a3]">Frekwencja</div><div className="mt-0.5 font-bold text-[#41525e]">{subject.attendance_pct === null ? "—" : `${subject.attendance_pct}%`}</div></div>
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#e8edf2]"><div className="text-[#8a98a3]">Średnia ważona</div><div className="mt-0.5 font-bold text-[#41525e]">{subject.weighted_average ?? "—"}</div></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#81909b]"><span>{subject.pass_type || "Forma zaliczenia —"}</span><span>{subject.pass_date ? fmtDate(subject.pass_date) : "Termin —"}</span></div>
            </Link>)}
          </div> : <EmptyState title="Brak przedmiotów" description="Dodaj pierwszy przedmiot i zacznij budować plan semestru."/>}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader><div><h2 className="font-bold text-[#2a3944]">Najbliższe zajęcia</h2><div className="text-xs text-[#83909b]">kolejne pozycje planu</div></div></CardHeader>
          <CardContent className="space-y-2">
            {(upcoming || []).map((item: any) => <Link key={item.id} href={`/private/study/${item.subject_id}`} className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-[#e5eaf0] hover:bg-[#f7f9fc]">
              <div className="min-w-[76px] rounded-xl bg-violet-50 px-2 py-2 text-center text-xs font-bold text-violet-700">{fmtDateTime(item.starts_at)}</div>
              <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#34434e]">{item.study_subjects?.name || item.title || "Zajęcia"}</div><div className="mt-0.5 text-xs text-[#84919c]">{classTypeLabel(item.class_type)}{item.room ? ` · ${item.room}` : ""}</div></div>
            </Link>)}
            {!(upcoming || []).length && <EmptyState title="Brak zajęć" description="Dodaj zajęcia przy konkretnym przedmiocie."/>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><h2 className="font-bold text-[#2a3944]">Najbliższe zaliczenia</h2><div className="text-xs text-[#83909b]">egzaminy, projekty i zaliczenia</div></div></CardHeader>
          <CardContent className="space-y-2">
            {(exams || []).map((subject: any) => <Link key={subject.id} href={`/private/study/${subject.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[#f7f9fc]"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#34434e]">{subject.name}</div><div className="mt-0.5 text-xs text-[#84919c]">{subject.pass_type || "Zaliczenie"}</div></div><Badge variant="amber">{fmtDate(subject.pass_date)}</Badge></Link>)}
            {!(exams || []).length && <EmptyState title="Brak terminów" description="Dodaj terminy zaliczeń w danych przedmiotów."/>}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>;
}
