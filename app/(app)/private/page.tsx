import Link from "next/link";
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckSquare2,
  CircleDollarSign,
  Clock3,
  FileUp,
  GraduationCap,
  ListTodo,
  MapPin,
  RefreshCw,
  Repeat2,
  WalletCards,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInWarsaw, warsawDayRange } from "@/lib/date";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { cn } from "@/lib/utils";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
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

function fmtTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function fmtStatusDate(value?: string | null) {
  if (!value) return "brak danych";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function money(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function classCode(value?: string | null) {
  return value === "lecture"
    ? "WYK"
    : value === "exercise"
      ? "ĆW"
      : value === "workshop"
        ? "WAR"
        : value === "lab"
          ? "LAB"
          : value === "seminar"
            ? "SEM"
            : "ZAJ";
}

export default async function PrivateDashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const today = todayInWarsaw();
  const now = new Date().toISOString();
  const { start: todayStart, end: todayEnd } = warsawDayRange(today);

  const monthDate = parseISO(`${today.slice(0, 7)}-01`);
  const monthFrom = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthTo = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const recurringFrom = format(addMonths(monthDate, -2), "yyyy-MM-dd");

  const [
    { data: todayClasses },
    { data: todayEvents },
    { data: todayTasks },
    { data: upcomingClasses },
    { data: exams },
    { data: tasks },
    taskCountResult,
    financeResult,
    taxProfileResult,
    recurringResult,
    attendanceResult,
    syncResult,
    importResult,
  ] = await Promise.all([
    supabase
      .from("study_classes")
      .select("id,subject_id,class_type,title,room,building,starts_at,ends_at,attendance_status,study_subjects(name)")
      .eq("user_id", user.id)
      .gte("starts_at", todayStart)
      .lte("starts_at", todayEnd)
      .neq("attendance_status", "cancelled")
      .order("starts_at"),
    supabase
      .from("events")
      .select("id,title,event_type,starts_at,ends_at,scope")
      .in("scope", ["private","study"])
      .gte("starts_at", todayStart)
      .lte("starts_at", todayEnd)
      .order("starts_at"),
    supabase
      .from("tasks")
      .select("id,title,due_date,due_time,priority,scope,status")
      .eq("assigned_to", user.id)
      .in("scope", ["private","study"])
      .eq("due_date", today)
      .neq("status", "done")
      .order("due_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("study_classes")
      .select("id,subject_id,class_type,title,room,starts_at,attendance_status,study_subjects(name)")
      .eq("user_id", user.id)
      .gte("starts_at", now)
      .neq("attendance_status","cancelled")
      .order("starts_at")
      .limit(4),
    supabase
      .from("study_subjects")
      .select("id,name,pass_type,pass_date")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .gte("pass_date", today)
      .order("pass_date")
      .limit(4),
    supabase
      .from("tasks")
      .select("id,title,due_date,due_time,priority,scope")
      .eq("assigned_to", user.id)
      .in("scope", ["private","study"])
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .in("scope", ["private","study"])
      .neq("status", "done"),
    supabase
      .from("finance_transactions")
      .select("transaction_type,scope,amount,occurred_on")
      .eq("user_id", user.id)
      .gte("occurred_on", monthFrom)
      .lte("occurred_on", monthTo),
    supabase
      .from("finance_tax_profiles")
      .select("tax_method,tax_rate,social_zus_monthly,health_contribution_rate")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("finance_transactions")
      .select("id,description,amount,scope,occurred_on,finance_categories(name)")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .eq("recurring", true)
      .gte("occurred_on", recurringFrom)
      .order("occurred_on", { ascending: false })
      .limit(30),
    supabase
      .from("study_subject_summary")
      .select("present_count,absent_count")
      .eq("user_id", user.id)
      .is("archived_at", null),
    supabase
      .from("usos_sync_runs")
      .select("status,subjects_count,classes_count,updated_count,cancelled_count,error_message,started_at,finished_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("finance_import_batches")
      .select("file_name,imported_count,skipped_count,status,error_message,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const financeRows = financeResult.data || [];
  const financeReady = !financeResult.error;
  const taxProfile = taxProfileResult.data as any;
  const taxReady = !taxProfileResult.error && Boolean(taxProfile);

  const monthIncome = financeRows
    .filter((row:any) => row.transaction_type === "income")
    .reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const monthExpenses = financeRows
    .filter((row:any) => row.transaction_type === "expense")
    .reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const monthBalance = monthIncome - monthExpenses;

  const businessIncome = financeRows
    .filter((row:any) => row.transaction_type === "income" && row.scope === "business")
    .reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);
  const businessExpenses = financeRows
    .filter((row:any) => row.transaction_type === "expense" && row.scope === "business")
    .reduce((sum:number,row:any) => sum + Number(row.amount || 0), 0);

  const socialZus = Number(taxProfile?.social_zus_monthly || 0);
  const healthRate = Number(taxProfile?.health_contribution_rate ?? 9);
  const taxRate = Number(taxProfile?.tax_rate || 0);
  const taxMethod = String(taxProfile?.tax_method || "profit_rate");
  const healthBase = Math.max(0, businessIncome - businessExpenses - socialZus);
  const healthContribution = taxReady ? healthBase * healthRate / 100 : 0;
  const taxableBase = taxMethod === "revenue_rate"
    ? Math.max(0, businessIncome - socialZus)
    : Math.max(0, businessIncome - businessExpenses - socialZus);
  const estimatedTax = taxReady ? taxableBase * taxRate / 100 : 0;
  const estimatedNet = taxReady
    ? businessIncome - businessExpenses - socialZus - healthContribution - estimatedTax
    : null;

  const attendanceRows = attendanceResult.data || [];
  const present = attendanceRows.reduce((sum:number,row:any) => sum + Number(row.present_count || 0), 0);
  const absent = attendanceRows.reduce((sum:number,row:any) => sum + Number(row.absent_count || 0), 0);
  const attendance = present + absent > 0 ? Math.round((present / (present + absent)) * 1000) / 10 : null;

  const recurringByDescription = new Map<string, any>();
  for (const row of recurringResult.data || []) {
    const key = `${row.scope}|${String(row.description || "").trim().toLowerCase()}`;
    if (!recurringByDescription.has(key)) recurringByDescription.set(key, row);
  }
  const recurringExpenses = [...recurringByDescription.values()].slice(0, 5);
  const recurringTotal = recurringExpenses.reduce((sum,row:any) => sum + Number(row.amount || 0), 0);

  const syncRun = syncResult.data as any;
  const lastImport = importResult.data as any;

  const agenda = [
    ...(todayClasses || []).map((item:any) => ({
      id: `study:${item.id}`,
      kind: "study" as const,
      href: `/private/study/${item.subject_id}/classes/${item.id}`,
      time: fmtTime(item.starts_at),
      sort: item.starts_at,
      title: item.study_subjects?.name || item.title || "Zajęcia",
      meta: [classCode(item.class_type), item.room ? `sala ${item.room}` : null].filter(Boolean).join(" · "),
    })),
    ...(todayEvents || []).map((item:any) => ({
      id: `event:${item.id}`,
      kind: "event" as const,
      href: `/private/calendar?view=day&date=${today}`,
      time: fmtTime(item.starts_at),
      sort: item.starts_at,
      title: item.title,
      meta: item.event_type === "meeting" ? "Spotkanie" : item.event_type === "call" ? "Telefon" : item.event_type === "follow_up" ? "Follow-up" : "Wydarzenie",
    })),
    ...(todayTasks || []).map((item:any) => ({
      id: `task:${item.id}`,
      kind: "task" as const,
      href: "/private/tasks",
      time: item.due_time ? String(item.due_time).slice(0,5) : "Dziś",
      sort: item.due_time ? `${today}T${String(item.due_time).slice(0,8)}` : `${today}T23:59:59`,
      title: item.title,
      meta: item.priority === "urgent" ? "Pilne" : item.priority === "high" ? "Wysoki priorytet" : item.scope === "study" ? "Studia" : "Zadanie",
    })),
  ].sort((a,b) => a.sort.localeCompare(b.sort));

  const openTasksCount = taskCountResult.count ?? (tasks || []).length;
  const todayCount = agenda.length;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b99a4]">Prywatne</div>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-[#263640]">Twój cockpit</h1>
        <p className="mt-1 text-sm text-[#7d8b96]">Dzisiaj, studia, finanse i najważniejsze rzeczy w jednym miejscu.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/private/calendar" className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe6ee] bg-white px-3 text-sm font-semibold text-[#536674] transition hover:-translate-y-px hover:bg-[#f7f9fc]"><CalendarDays size={15}/> Kalendarz</Link>
        <Link href="/private/tasks" className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe6ee] bg-white px-3 text-sm font-semibold text-[#536674] transition hover:-translate-y-px hover:bg-[#f7f9fc]"><ListTodo size={15}/> Zadania</Link>
        <Link href="/private/study" className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe6ee] bg-white px-3 text-sm font-semibold text-[#536674] transition hover:-translate-y-px hover:bg-[#f7f9fc]"><GraduationCap size={15}/> Studia</Link>
        <Link href="/private/finance" className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#568deb] px-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#477edb]"><WalletCards size={15}/> Finanse</Link>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Dzisiaj" value={todayCount} hint="zajęcia, wydarzenia i zadania" icon={CalendarDays} tone="blue"/>
      <StatCard label="Aktywne zadania" value={openTasksCount} hint="najbliższe pozycje" icon={CheckSquare2} tone="slate"/>
      <StatCard label="Frekwencja" value={attendance === null ? "—" : `${attendance}%`} hint={attendance === null ? "brak oznaczonych zajęć" : `${present} obecności · ${absent} nieobecności`} icon={BookOpenCheck} tone={attendance !== null && attendance >= 80 ? "green" : "amber"}/>
      <StatCard label="Saldo miesiąca" value={financeReady ? money(monthBalance) : "—"} hint={financeReady ? `${money(monthIncome)} przychodów` : "moduł finansowy nieaktywny"} icon={CircleDollarSign} tone={monthBalance >= 0 ? "green" : "amber"}/>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <Card className="overflow-hidden border-[#d8e3f6]">
        <CardHeader className="flex-col items-start sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><Clock3 size={18}/></div>
            <div><h2 className="font-bold text-[#2a3944]">Dzisiaj</h2><div className="text-xs text-[#83909b]">{todayCount} pozycji w planie dnia</div></div>
          </div>
          <Link href={`/private/calendar?view=day&date=${today}`} className="text-sm font-semibold text-[#5f79ad]">Pełny dzień <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent>
          {agenda.length ? <div className="relative space-y-2 before:absolute before:bottom-5 before:left-[43px] before:top-5 before:w-px before:bg-[#e7edf4]">
            {agenda.map(item => <Link key={item.id} href={item.href} className="relative grid grid-cols-[70px_1fr] gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[#f7f9fc]">
              <div className="z-[1] flex items-start">
                <span className="rounded-lg border border-[#dfe6ee] bg-white px-2 py-1 text-xs font-bold text-[#60717e] shadow-sm">{item.time}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-bold text-[#34444f]">{item.title}</div>
                  <Badge variant={item.kind === "study" ? "blue" : item.kind === "event" ? "green" : "neutral"}>{item.kind === "study" ? "Studia" : item.kind === "event" ? "Kalendarz" : "Zadanie"}</Badge>
                </div>
                {item.meta && <div className="mt-1 text-xs text-[#84929d]">{item.meta}</div>}
              </div>
            </Link>)}
          </div> : <EmptyState title="Dzisiaj jest pusto" description="Brak zajęć, wydarzeń i zadań z terminem na dziś."/>}
        </CardContent>
      </Card>

      <Card className={taxReady ? "border-emerald-200" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><WalletCards size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Finanse miesiąca</h2><div className="text-xs text-[#83909b]">Prywatne + działalność</div></div></div>
          <Link href="/private/finance" className="text-sm font-semibold text-[#5f79ad]">Otwórz <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent>
          {financeReady ? <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700">Szacowane netto firmy</div>
              <div className="mt-1 text-3xl font-black tracking-[-0.04em] text-emerald-700">{estimatedNet === null ? "—" : money(estimatedNet)}</div>
              <div className="mt-1 text-xs text-emerald-700/75">{estimatedNet === null ? "Ustaw założenia podatkowe w Finansach." : `zdrowotna ${healthRate}% dochodu · podatek ${taxRate}%`}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">Przychody</div><div className="mt-1 font-bold text-[#40515d]">{money(monthIncome)}</div></div>
              <div className="rounded-xl bg-[#f7f9fc] p-3"><div className="text-[#8996a0]">Koszty</div><div className="mt-1 font-bold text-[#40515d]">{money(monthExpenses)}</div></div>
              <div className="rounded-xl bg-[#edf3ff] p-3"><div className="text-[#6f83ad]">Saldo</div><div className="mt-1 font-bold text-[#416fc9]">{money(monthBalance)}</div></div>
            </div>
          </div> : <EmptyState title="Finanse nieaktywne" description="Uruchom moduł Finansów, aby zobaczyć podsumowanie."/>}
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2 text-violet-600"><BookOpenCheck size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe zajęcia</h2><div className="text-xs text-[#83909b]">kolejne bloki</div></div></div>
          <Link href="/private/study" className="text-sm font-semibold text-[#5f79ad]">Studia <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {(upcomingClasses || []).map((item:any) => <Link key={item.id} href={`/private/study/${item.subject_id}/classes/${item.id}`} className="block rounded-xl border border-[#edf1f5] px-3 py-3 transition hover:bg-[#f7f9fc]">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-semibold text-[#40515d]">{item.study_subjects?.name || item.title || "Zajęcia"}</div>
              <Badge variant="blue">{classCode(item.class_type)}</Badge>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-[#8996a0]"><span>{fmtDateTime(item.starts_at)}</span>{item.room && <span className="inline-flex items-center gap-1"><MapPin size={11}/>{item.room}</span>}</div>
          </Link>)}
          {!(upcomingClasses || []).length && <EmptyState title="Brak zajęć" description="Plan jest pusty."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><GraduationCap size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe zaliczenia</h2><div className="text-xs text-[#83909b]">egzaminy i zaliczenia</div></div></div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(exams || []).map((item:any) => <Link key={item.id} href={`/private/study/${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3 transition hover:bg-[#f7f9fc]">
            <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#40515d]">{item.name}</div><div className="mt-0.5 text-xs text-[#8996a0]">{item.pass_type || "Zaliczenie"}</div></div>
            <Badge variant="amber">{fmtDate(item.pass_date)}</Badge>
          </Link>)}
          {!(exams || []).length && <EmptyState title="Brak terminów" description="Nie ma zapisanych przyszłych zaliczeń."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><ListTodo size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe zadania</h2><div className="text-xs text-[#83909b]">prywatne + studia</div></div></div>
          <Link href="/private/tasks" className="text-sm font-semibold text-[#5f79ad]">Zadania <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {(tasks || []).map((task:any) => <Link key={task.id} href="/private/tasks" className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3 transition hover:bg-[#f7f9fc]">
            <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#40515d]">{task.title}</div><div className="mt-0.5 text-xs text-[#8996a0]">{task.due_date ? fmtDate(task.due_date) : "bez terminu"}{task.due_time ? ` · ${String(task.due_time).slice(0,5)}` : ""}</div></div>
            <Badge variant={task.priority === "urgent" || task.priority === "high" ? "amber" : task.scope === "study" ? "blue" : "neutral"}>{task.priority === "urgent" ? "Pilne" : task.scope === "study" ? "Studia" : "Prywatne"}</Badge>
          </Link>)}
          {!(tasks || []).length && <EmptyState title="Brak zadań" description="Lista jest czysta."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-[#f3f0ff] p-2 text-[#7461c8]"><Repeat2 size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Koszty cykliczne</h2><div className="text-xs text-[#83909b]">ostatnio oznaczone jako stałe</div></div></div>
          <Link href="/private/finance" className="text-sm font-semibold text-[#5f79ad]">Finanse <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recurringExpenses.map((item:any) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f5] px-3 py-3">
            <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#40515d]">{item.description}</div><div className="mt-0.5 text-xs text-[#8996a0]">{item.finance_categories?.name || "bez kategorii"} · {item.scope === "business" ? "firmowe" : "prywatne"}</div></div>
            <div className="text-sm font-black text-[#536674]">{money(Number(item.amount || 0))}</div>
          </div>)}
          {recurringExpenses.length ? <div className="flex items-center justify-between rounded-xl bg-[#f7f9fc] px-3 py-2.5 text-xs"><span className="font-semibold text-[#7a8994]">Suma widocznych</span><span className="font-black text-[#40515d]">{money(recurringTotal)}</span></div> : <EmptyState title="Brak kosztów cyklicznych" description="Oznacz koszt jako stały w Finansach."/>}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <div><h2 className="font-bold text-[#2a3944]">Status systemu</h2><div className="text-xs text-[#83909b]">ostatnie automatyzacje danych</div></div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Link href="/private/study" className="rounded-2xl border border-[#edf1f5] p-4 transition hover:bg-[#f8fbff]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2 text-violet-600"><RefreshCw size={16}/></div><div><div className="text-sm font-bold text-[#40515d]">Synchronizacja USOS</div><div className="mt-0.5 text-xs text-[#8996a0]">{fmtStatusDate(syncRun?.finished_at || syncRun?.started_at)}</div></div></div>
            <Badge variant={!syncRun ? "neutral" : syncRun.status === "success" ? "green" : syncRun.status === "error" ? "red" : "amber"}>{!syncRun ? "Brak" : syncRun.status === "success" ? "OK" : syncRun.status === "error" ? "Błąd" : "W trakcie"}</Badge>
          </div>
          {syncRun?.status === "success" && <div className="mt-3 text-xs text-[#75848f]">{syncRun.subjects_count || 0} przedmiotów · {syncRun.classes_count || 0} zajęć · {syncRun.updated_count || 0} aktualizacji</div>}
          {syncRun?.status === "error" && <div className="mt-3 line-clamp-2 text-xs text-red-600">{syncRun.error_message || "Synchronizacja zakończona błędem."}</div>}
        </Link>

        <Link href="/private/finance" className="rounded-2xl border border-[#edf1f5] p-4 transition hover:bg-[#f8fbff]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><FileUp size={16}/></div><div><div className="text-sm font-bold text-[#40515d]">Ostatni import bankowy</div><div className="mt-0.5 text-xs text-[#8996a0]">{fmtStatusDate(lastImport?.created_at)}</div></div></div>
            <Badge variant={!lastImport ? "neutral" : lastImport.status === "completed" ? "green" : lastImport.status === "partial" ? "amber" : "red"}>{!lastImport ? "Brak" : lastImport.status === "completed" ? "OK" : lastImport.status === "partial" ? "Częściowy" : "Błąd"}</Badge>
          </div>
          {lastImport && <div className="mt-3 text-xs text-[#75848f]"><span className="font-semibold">{lastImport.file_name}</span> · {lastImport.imported_count || 0} zaimportowanych · {lastImport.skipped_count || 0} pominiętych</div>}
        </Link>
      </CardContent>
    </Card>
  </div>;
}
