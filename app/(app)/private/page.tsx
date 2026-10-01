import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, CheckSquare2, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { warsawDayRange } from "@/lib/date";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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

export default async function PrivateDashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const { start: todayStart, end: todayEnd } = warsawDayRange(today);

  const [{ data: todayClasses }, { data: classes }, { data: exams }, { data: tasks }] = await Promise.all([
    supabase.from("study_classes").select("id,subject_id,class_type,title,room,building,starts_at,ends_at,attendance_status,study_subjects(name)").eq("user_id", user.id).gte("starts_at", todayStart).lte("starts_at", todayEnd).neq("attendance_status","cancelled").order("starts_at"),
    supabase.from("study_classes").select("id,subject_id,class_type,title,room,starts_at,attendance_status,study_subjects(name)").eq("user_id", user.id).gte("starts_at", now).neq("attendance_status","cancelled").order("starts_at").limit(5),
    supabase.from("study_subjects").select("id,name,pass_type,pass_date").eq("user_id", user.id).is("archived_at", null).gte("pass_date", today).order("pass_date").limit(5),
    supabase.from("tasks").select("id,title,due_date,due_time,priority,scope").eq("assigned_to", user.id).in("scope", ["private","study"]).neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(7),
  ]);

  return <div className="space-y-7">
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b99a4]">Prywatne</div>
      <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-[#263640]">Dashboard</h1>
    </div>

    <Card className="overflow-hidden border-violet-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-2 text-violet-600"><CalendarDays size={18}/></div>
          <div><h2 className="font-bold text-[#2a3944]">Dzisiaj na studiach</h2><div className="text-xs text-[#83909b]">${todayClasses?.length || 0} bloków zajęć</div></div>
        </div>
        <Link href={`/private/calendar?view=day&date=${today}`} className="text-sm font-semibold text-[#5f79ad]">Kalendarz <ArrowRight size={15} className="inline"/></Link>
      </CardHeader>
      <CardContent>
        {(todayClasses || []).length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(todayClasses || []).map((item:any) => <Link key={item.id} href={`/private/study/${item.subject_id}/classes/${item.id}`} className="rounded-2xl border border-[#e8e2fb] bg-violet-50/60 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_26px_rgba(73,52,130,.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="truncate text-sm font-bold text-[#3f315f]">{item.study_subjects?.name || item.title || "Zajęcia"}</div><div className="mt-1 text-xs font-semibold text-violet-700">{fmtDateTime(item.starts_at)}{item.ends_at ? `–${new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(item.ends_at))}` : ""}</div></div>
              <Badge variant="blue">{item.class_type === "lecture" ? "WYK" : item.class_type === "exercise" ? "ĆW" : item.class_type === "workshop" ? "WAR" : item.class_type === "lab" ? "LAB" : item.class_type === "seminar" ? "SEM" : "ZAJ"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7c7090]">
              {item.room && <span className="inline-flex items-center gap-1"><MapPin size={12}/>{item.room}</span>}
              {item.building && <span className="truncate">{item.building}</span>}
            </div>
          </Link>)}
        </div> : <EmptyState title="Dziś bez zajęć" description="Plan na dzisiaj jest pusty."/>}
      </CardContent>
    </Card>

    <div className="grid gap-5 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2 text-violet-600"><BookOpenCheck size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe zajęcia</h2><div className="text-xs text-[#83909b]">Studia</div></div></div>
          <Link href="/private/study" className="text-sm font-semibold text-[#5f79ad]">Studia <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {(classes || []).map((item: any) => <Link key={item.id} href={`/private/study/${item.subject_id}/classes/${item.id}`} className="block rounded-xl border border-[#edf1f5] px-3 py-3 transition hover:bg-[#f7f9fc]">
            <div className="truncate text-sm font-semibold text-[#40515d]">{item.study_subjects?.name || item.title || "Zajęcia"}</div>
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-[#8996a0]"><span>{fmtDateTime(item.starts_at)}</span>{item.room && <span>{item.room}</span>}</div>
          </Link>)}
          {!(classes || []).length && <EmptyState title="Brak zajęć" description="Dodaj plan w sekcji Studia."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><CalendarDays size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe zaliczenia</h2><div className="text-xs text-[#83909b]">Terminy</div></div></div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(exams || []).map((item: any) => <Link key={item.id} href={`/private/study/${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3 transition hover:bg-[#f7f9fc]"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#40515d]">{item.name}</div><div className="mt-0.5 text-xs text-[#8996a0]">{item.pass_type || "Zaliczenie"}</div></div><Badge variant="amber">{fmtDate(item.pass_date)}</Badge></Link>)}
          {!(exams || []).length && <EmptyState title="Brak terminów" description="Uzupełnij daty zaliczeń przy przedmiotach."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><CheckSquare2 size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Zadania prywatne</h2><div className="text-xs text-[#83909b]">Prywatne + studia</div></div></div>
          <Link href="/private/tasks" className="text-sm font-semibold text-[#5f79ad]">Zadania <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {(tasks || []).map((task: any) => <Link key={task.id} href="/private/tasks" className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3 transition hover:bg-[#f7f9fc]"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#40515d]">{task.title}</div><div className="mt-0.5 text-xs text-[#8996a0]">{task.due_date ? fmtDate(task.due_date) : "bez terminu"}{task.due_time ? ` · ${String(task.due_time).slice(0,5)}` : ""}</div></div><Badge variant={task.scope === "study" ? "blue" : "neutral"}>{task.scope === "study" ? "Studia" : "Prywatne"}</Badge></Link>)}
          {!(tasks || []).length && <EmptyState title="Brak aktywnych zadań" description="Prywatna lista jest czysta."/>}
        </CardContent>
      </Card>
    </div>
  </div>;
}
