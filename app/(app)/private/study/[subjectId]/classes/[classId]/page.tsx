import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, CalendarDays, Check, CircleSlash2, ExternalLink, FileText, GraduationCap, MapPin, Pencil, Plus, UserRound, X } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGoogleIntegration } from "@/lib/google";
import { createStudyGoogleDoc, deleteStudyNote } from "@/lib/actions/google-study";
import { createStudyGrade, setStudyAttendance, updateStudyClass, updateStudyClassNotes } from "@/lib/actions/study";
import { ActionForm } from "@/components/action-form";
import { FormDisclosure } from "@/components/form-disclosure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function fmtTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function dateInput(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function classTypeLabel(value: string) {
  if (value === "lecture") return "Wykład";
  if (value === "exercise") return "Ćwiczenia";
  if (value === "lab") return "Laboratorium";
  if (value === "seminar") return "Seminarium";
  if (value === "workshop") return "Warsztaty";
  return "Inne zajęcia";
}

function classTypeCode(value: string) {
  if (value === "lecture") return "WYK";
  if (value === "exercise") return "ĆW";
  if (value === "lab") return "LAB";
  if (value === "seminar") return "SEM";
  if (value === "workshop") return "WAR";
  return "ZAJ";
}

function attendanceLabel(status: string) {
  if (status === "present") return "Obecny";
  if (status === "absent") return "Nieobecny";
  if (status === "cancelled") return "Odwołane";
  return "Nieoznaczone";
}

export default async function StudyClassPage({ params }: { params: Promise<{ subjectId: string; classId: string }> }) {
  const user = await requireUser();
  const { subjectId, classId } = await params;
  const supabase = await createClient();

  const [{ data: subject }, { data: studyClass }, { data: grades }, { data: docs }, googleIntegration] = await Promise.all([
    supabase.from("study_subject_summary").select("*").eq("id", subjectId).eq("user_id", user.id).maybeSingle(),
    supabase.from("study_classes").select("*").eq("id", classId).eq("subject_id", subjectId).eq("user_id", user.id).maybeSingle(),
    supabase.from("study_grades").select("*").eq("class_id", classId).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("study_notes").select("*").eq("class_id", classId).eq("user_id", user.id).order("created_at", { ascending: false }),
    getGoogleIntegration(user.id).catch(() => null),
  ]);

  if (!subject || !studyClass) notFound();

  const isUsos = String(studyClass.source || "").startsWith("usos:");
  const attendanceVariant = studyClass.attendance_status === "present" ? "green" : studyClass.attendance_status === "absent" ? "red" : "neutral";

  const editForm = <ActionForm
    action={updateStudyClass.bind(null, classId, subjectId)}
    successMessage="Zajęcia zaktualizowane"
    className="grid gap-4 md:grid-cols-2"
  >
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label><Input name="date" type="date" required defaultValue={dateInput(studyClass.starts_at)}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ zajęć</label><Select name="class_type" defaultValue={studyClass.class_type}><option value="lecture">Wykład</option><option value="exercise">Ćwiczenia</option><option value="lab">Laboratorium</option><option value="seminar">Seminarium</option><option value="workshop">Warsztaty</option><option value="other">Inne</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Od</label><TimePicker name="start_time" defaultValue={fmtTime(studyClass.starts_at)} required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Do</label><TimePicker name="end_time" defaultValue={fmtTime(studyClass.ends_at)} optional/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Sala</label><Input name="room" defaultValue={studyClass.room || ""}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Prowadzący</label><Input name="lecturer" defaultValue={studyClass.lecturer || ""}/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Tytuł / temat</label><Input name="title" defaultValue={studyClass.title || ""}/></div>
    <input type="hidden" name="notes" value={studyClass.notes || ""}/>
    <div className="md:col-span-2 flex justify-end"><Button type="submit">Zapisz zmiany</Button></div>
  </ActionForm>;

  const gradeForm = <ActionForm
    action={createStudyGrade.bind(null, subjectId)}
    successMessage="Ocena dodana do zajęć"
    resetOnSuccess
    className="grid gap-4 md:grid-cols-2"
  >
    <input type="hidden" name="class_id" value={classId}/>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Co oceniono?</label><Input name="label" required placeholder="Np. aktywność, wejściówka, odpowiedź"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Ocena</label><Input name="grade" type="number" min="1" max="6" step="0.5" required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Waga (%)</label><Input name="weight" type="number" min="0" max="100" step="0.5" defaultValue="0"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label><Input name="graded_at" type="date" defaultValue={dateInput(studyClass.starts_at)}/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Komentarz</label><Textarea name="notes" rows={2}/></div>
    <div className="md:col-span-2 flex justify-end"><Button type="submit"><Plus size={15}/> Dodaj ocenę</Button></div>
  </ActionForm>;

  const googleDocForm = <ActionForm
    action={createStudyGoogleDoc.bind(null, subjectId, classId)}
    successMessage="Notatka Google Docs utworzona"
    resetOnSuccess
    className="grid gap-3"
  >
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa dokumentu</label><Input name="title" placeholder="Opcjonalnie — nadamy nazwę automatycznie"/></div>
    <div className="flex justify-end"><Button type="submit"><FileText size={15}/> Utwórz Google Doc</Button></div>
  </ActionForm>;

  return <div className="space-y-6">
    <div>
      <Link href={`/private/study/${subjectId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b7d8a] transition hover:text-[#3f6fd0]"><ArrowLeft size={15}/> {subject.name}</Link>

      <div className="rounded-[22px] border border-[#dfe6ee] bg-white px-5 py-5 shadow-[0_8px_28px_rgba(30,48,64,.035)] sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blue">{classTypeCode(studyClass.class_type)}</Badge>
              {isUsos && <Badge variant="green">USOS</Badge>}
              <Badge variant={attendanceVariant as "green"|"red"|"neutral"}>{attendanceLabel(studyClass.attendance_status)}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] text-[#24343f] sm:text-[30px]">{subject.name}</h1>
            <div className="mt-1 text-sm font-semibold text-[#72818c]">{classTypeLabel(studyClass.class_type)} · {fmtDate(studyClass.starts_at)}</div>
          </div>
          {!isUsos && <FormDisclosure label="Edytuj zajęcia" variant="secondary" align="right">{editForm}</FormDisclosure>}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[#f7f9fc] p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-[#8a98a3]"><CalendarDays size={14}/> Godzina</div><div className="mt-1.5 font-bold text-[#3d4f5b]">{fmtTime(studyClass.starts_at)}{studyClass.ends_at ? `–${fmtTime(studyClass.ends_at)}` : ""}</div></div>
          <div className="rounded-2xl bg-[#f7f9fc] p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-[#8a98a3]"><MapPin size={14}/> Sala</div><div className="mt-1.5 font-bold text-[#3d4f5b]">{studyClass.room || "—"}</div></div>
          <div className="rounded-2xl bg-[#f7f9fc] p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-[#8a98a3]"><BookOpenCheck size={14}/> Budynek</div><div className="mt-1.5 truncate font-bold text-[#3d4f5b]">{studyClass.building || "—"}</div></div>
          <div className="rounded-2xl bg-[#f7f9fc] p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-[#8a98a3]"><UserRound size={14}/> Prowadzący</div><div className="mt-1.5 truncate font-bold text-[#3d4f5b]">{studyClass.lecturer || subject.lecturer || "—"}</div></div>
        </div>
      </div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader><div><h2 className="font-bold text-[#2a3944]">Obecność</h2><div className="text-xs text-[#83909b]">status tylko dla tego bloku zajęć</div></div></CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <ActionForm action={setStudyAttendance.bind(null, classId, subjectId, "present")} successMessage="Obecność zaznaczona"><Button type="submit" className="w-full" variant={studyClass.attendance_status === "present" ? "primary" : "soft"}><Check size={15}/> Obecny</Button></ActionForm>
              <ActionForm action={setStudyAttendance.bind(null, classId, subjectId, "absent")} successMessage="Nieobecność zaznaczona"><Button type="submit" className="w-full" variant={studyClass.attendance_status === "absent" ? "danger" : "secondary"}><X size={15}/> Nieobecny</Button></ActionForm>
              <ActionForm action={setStudyAttendance.bind(null, classId, subjectId, "cancelled")} successMessage="Zajęcia oznaczone jako odwołane"><Button type="submit" className="w-full" variant="ghost"><CircleSlash2 size={15}/> Odwołane</Button></ActionForm>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><h2 className="font-bold text-[#2a3944]">Oceny z tych zajęć</h2><div className="text-xs text-[#83909b]">automatycznie trafiają też do karty przedmiotu</div></div><FormDisclosure label="Dodaj ocenę" compact align="right">{gradeForm}</FormDisclosure></CardHeader>
          <CardContent className="space-y-2">
            {(grades || []).map((grade:any) => <div key={grade.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3">
              <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#40515d]">{grade.label}</div><div className="mt-0.5 text-xs text-[#8996a0]">waga {Number(grade.weight || 0)}%{grade.notes ? ` · ${grade.notes}` : ""}</div></div>
              <div className="rounded-xl bg-[#edf3ff] px-3 py-1.5 text-sm font-bold text-[#416fc9]">{Number(grade.grade)}</div>
            </div>)}
            {!(grades || []).length && <EmptyState title="Brak ocen z tych zajęć" description="Jeśli dostaniesz ocenę za aktywność, wejściówkę lub odpowiedź, przypisz ją bezpośrednio tutaj."/>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader><div><h2 className="font-bold text-[#2a3944]">Notatka z zajęć</h2><div className="text-xs text-[#83909b]">krótka notatka przypisana wyłącznie do tego bloku</div></div><Pencil size={17} className="text-[#83909b]"/></CardHeader>
          <CardContent>
            <ActionForm action={updateStudyClassNotes.bind(null, classId, subjectId)} successMessage="Notatka zapisana" className="space-y-3">
              <Textarea name="notes" rows={8} defaultValue={studyClass.notes || ""} placeholder="Temat zajęć, najważniejsze punkty, rzeczy do powtórki..."/>
              <div className="flex justify-end"><Button type="submit">Zapisz notatkę</Button></div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div><h2 className="font-bold text-[#2a3944]">Materiały i Google Docs</h2><div className="text-xs text-[#83909b]">dokumenty przypięte tylko do tych zajęć</div></div>
            {googleIntegration ? <FormDisclosure label="Google Doc" compact align="right">{googleDocForm}</FormDisclosure> : <Link href="/settings" className="text-sm font-semibold text-[#5f79ad]">Podłącz Google</Link>}
          </CardHeader>
          <CardContent className="space-y-2">
            {(docs || []).map((note:any) => <div key={note.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3">
              <a href={note.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 group"><div className="truncate text-sm font-semibold text-[#40515d] group-hover:text-[#3e6fd4]">{note.title}</div><div className="mt-0.5 text-xs text-[#8996a0]">Google Docs</div></a>
              <div className="flex items-center gap-1">
                <a href={note.url} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#60717e] transition hover:bg-[#edf2f7]"><ExternalLink size={15}/></a>
                <ActionForm action={deleteStudyNote.bind(null, note.id, subjectId)} successMessage="Link do notatki usunięty"><Button type="submit" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">Usuń</Button></ActionForm>
              </div>
            </div>)}
            {!(docs || []).length && <EmptyState title="Brak materiałów" description={googleIntegration ? "Możesz jednym kliknięciem utworzyć Google Doc dla tych konkretnych zajęć." : "Podłącz Google, aby tworzyć dokumenty z poziomu karty zajęć."}/>}
          </CardContent>
        </Card>

        <Link href={`/private/study/${subjectId}`} className="flex items-center justify-between rounded-2xl border border-[#dfe6ee] bg-white px-4 py-3.5 text-sm font-semibold text-[#536674] shadow-[0_1px_2px_rgba(28,44,60,.025)] transition hover:border-[#cdd8e3] hover:text-[#3e6fd4]">
          <span className="inline-flex items-center gap-2"><GraduationCap size={16}/> Wróć do karty przedmiotu</span>
          <ArrowLeft size={15} className="rotate-180"/>
        </Link>
      </div>
    </div>
  </div>;
}
