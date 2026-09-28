import Link from "next/link";
import { BookOpenCheck, CalendarClock, CheckCircle2, GraduationCap, Link2, Plus, RefreshCw, School, Trophy, Unlink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createStudySubject } from "@/lib/actions/study";
import { disconnectUsos, syncUsosNow } from "@/lib/actions/usos";
import { getUsosConnection, usosProviderList, usosProviderName, type UsosProvider } from "@/lib/usos";
import { FormDisclosure } from "@/components/form-disclosure";
import { ActionForm } from "@/components/action-form";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";

export const maxDuration = 60;

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
  return value === "lecture" ? "Wykład" : value === "exercise" ? "Ćwiczenia" : value === "lab" ? "Laboratorium" : value === "seminar" ? "Seminarium" : value === "workshop" ? "Warsztaty" : "Inne";
}

function lastSyncLabel(value?: string | null) {
  if (!value) return "Jeszcze nie synchronizowano";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ usos?: string; provider?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const [{ data: subjects }, { data: upcoming }, { data: exams }, usosConnection] = await Promise.all([
    supabase.from("study_subject_summary").select("*").eq("user_id", user.id).is("archived_at", null).order("name"),
    supabase.from("study_classes").select("id,subject_id,class_type,title,room,building,starts_at,ends_at,attendance_status,source,study_subjects(name)").eq("user_id", user.id).gte("starts_at", now).order("starts_at").limit(8),
    supabase.from("study_subjects").select("id,name,pass_type,pass_date").eq("user_id", user.id).is("archived_at", null).gte("pass_date", today).order("pass_date").limit(8),
    getUsosConnection(user.id).catch(() => null),
  ]);

  const providers = usosProviderList();
  const activeSubjects = subjects || [];
  const totalEcts = activeSubjects.reduce((sum: number, subject: any) => sum + Number(subject.ects || 0), 0);
  const present = activeSubjects.reduce((sum: number, subject: any) => sum + Number(subject.present_count || 0), 0);
  const absent = activeSubjects.reduce((sum: number, subject: any) => sum + Number(subject.absent_count || 0), 0);
  const attendance = present + absent > 0 ? Math.round((present / (present + absent)) * 1000) / 10 : null;
  const syncSummary = usosConnection?.last_sync_summary || null;

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

    {params.usos === "synced" && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">USOS został podłączony, a plan studiów zsynchronizowany.</div>}
    {params.usos === "sync_error" && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">USOS został podłączony, ale pierwsza synchronizacja nie przeszła. Użyj „Synchronizuj teraz” poniżej.</div>}
    {["connect_error","callback_error","invalid_provider"].includes(params.usos || "") && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">Nie udało się dokończyć połączenia z USOS. Spróbuj ponownie.</div>}

    <Card className={usosConnection ? "border-emerald-200" : ""}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><School size={19}/></div>
          <div>
            <h2 className="font-bold text-[#2a3944]">USOS</h2>
            <div className="text-xs text-[#83909b]">Automatyczny plan studiów, przedmioty, sale i ECTS</div>
          </div>
        </div>
        {usosConnection && <Badge variant={usosConnection.last_sync_status === "error" ? "red" : "green"}>{usosConnection.last_sync_status === "error" ? "Błąd synchronizacji" : "Połączono"}</Badge>}
      </CardHeader>

      <CardContent>
        {usosConnection ? <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-bold text-[#34444f]">{usosProviderName(usosConnection.provider as UsosProvider)}</div>
              {usosConnection.external_user_name && <Badge variant="neutral">{usosConnection.external_user_name}</Badge>}
            </div>
            <div className="mt-1.5 text-xs text-[#7d8c97]">Ostatnia synchronizacja: {lastSyncLabel(usosConnection.last_sync_at)}</div>
            {syncSummary && !syncSummary.error && <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-[#f4f7fa] px-2.5 py-1.5 text-[#5c6e7a]">{Number(syncSummary.subjects || 0)} przedmiotów</span>
              <span className="rounded-lg bg-[#f4f7fa] px-2.5 py-1.5 text-[#5c6e7a]">{Number(syncSummary.classes || 0)} zajęć</span>
              {Number(syncSummary.classes_created || 0) > 0 && <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700">+{syncSummary.classes_created} nowych</span>}
              {Number(syncSummary.classes_cancelled || 0) > 0 && <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700">{syncSummary.classes_cancelled} odwołanych</span>}
            </div>}
            {syncSummary?.error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{String(syncSummary.error).slice(0, 300)}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionForm action={syncUsosNow} successMessage="Synchronizacja USOS zakończona"><Button type="submit"><RefreshCw size={15}/> Synchronizuj teraz</Button></ActionForm>
            <ActionForm action={disconnectUsos} successMessage="USOS został odłączony"><Button type="submit" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700"><Unlink size={15}/> Odłącz</Button></ActionForm>
          </div>
        </div> : <div>
          <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
            <div className="rounded-2xl border border-[#e5eaf0] bg-[#fbfcfe] p-4">
              <div className="text-sm font-bold text-[#34444f]">Jak to działa?</div>
              <div className="mt-3 space-y-3">
                {[
                  ["1", "Wybierz swoją uczelnię."],
                  ["2", "Zaloguj się na zwykłej stronie USOS i zaakceptuj dostęp do planu studiów."],
                  ["3", "Wrócisz tutaj automatycznie. OS utworzy przedmioty i wczyta plan bez ręcznego przepisywania."],
                ].map(([step, label]) => <div key={step} className="flex gap-3 text-sm leading-5 text-[#667884]"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf3ff] text-xs font-bold text-[#4c77d5]">{step}</div><div>{label}</div></div>)}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/>Salesly OS nigdy nie otrzymuje Twojego hasła do USOS. Autoryzacja odbywa się na stronie uczelni.</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {providers.map(provider => <div key={provider.id} className="flex flex-col rounded-2xl border border-[#e2e8ef] bg-white p-4">
                <div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black tracking-[-0.02em] text-[#31414c]">{provider.shortName}</div><div className="mt-1 text-sm leading-5 text-[#74838e]">{provider.name}</div></div><div className="rounded-xl bg-violet-50 p-2 text-violet-600"><School size={17}/></div></div>
                <div className="mt-auto pt-5">
                  {provider.configured ? <a href={`/api/usos/connect?provider=${provider.id}`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#4f84e7] bg-[#568deb] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(86,141,235,.18)] transition hover:bg-[#477ddd]"><Link2 size={15}/> Połącz z USOS</a> : <button disabled className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[#e2e7ed] bg-[#f5f7f9] px-4 text-sm font-semibold text-[#9aa5ae]">Integracja w konfiguracji</button>}
                </div>
              </div>)}
            </div>
          </div>
        </div>}
      </CardContent>
    </Card>

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
                <div className="flex flex-col items-end gap-1.5"><Badge variant="blue">{Number(subject.ects || 0)} ECTS</Badge>{subject.source === "usos" && <Badge variant="green">USOS</Badge>}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#e8edf2]"><div className="text-[#8a98a3]">Frekwencja</div><div className="mt-0.5 font-bold text-[#41525e]">{subject.attendance_pct === null ? "—" : `${subject.attendance_pct}%`}</div></div>
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#e8edf2]"><div className="text-[#8a98a3]">Średnia ważona</div><div className="mt-0.5 font-bold text-[#41525e]">{subject.weighted_average ?? "—"}</div></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#81909b]"><span>{subject.pass_type || "Forma zaliczenia —"}</span><span>{subject.pass_date ? fmtDate(subject.pass_date) : "Termin —"}</span></div>
            </Link>)}
          </div> : <EmptyState title="Brak przedmiotów" description={usosConnection ? "Uruchom synchronizację USOS lub dodaj przedmiot ręcznie." : "Połącz USOS albo dodaj pierwszy przedmiot ręcznie."}/>}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader><div><h2 className="font-bold text-[#2a3944]">Najbliższe zajęcia</h2><div className="text-xs text-[#83909b]">kolejne pozycje planu</div></div></CardHeader>
          <CardContent className="space-y-2">
            {(upcoming || []).map((item: any) => <Link key={item.id} href={`/private/study/${item.subject_id}`} className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-[#e5eaf0] hover:bg-[#f7f9fc]">
              <div className="min-w-[76px] rounded-xl bg-violet-50 px-2 py-2 text-center text-xs font-bold text-violet-700">{fmtDateTime(item.starts_at)}</div>
              <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#34434e]">{item.study_subjects?.name || item.title || "Zajęcia"}</div><div className="mt-0.5 text-xs text-[#84919c]">{classTypeLabel(item.class_type)}{item.room ? ` · sala ${item.room}` : ""}{item.building ? ` · ${item.building}` : ""}</div></div>
            </Link>)}
            {!(upcoming || []).length && <EmptyState title="Brak zajęć" description={usosConnection ? "Uruchom synchronizację planu." : "Połącz USOS lub dodaj zajęcia ręcznie."}/>}
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
