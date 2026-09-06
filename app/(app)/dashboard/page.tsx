import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckSquare, RefreshCcw, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { todayInWarsaw, warsawDayRange } from "@/lib/date";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const today = todayInWarsaw();
  const { start: dayStart, end: dayEnd } = warsawDayRange(today);

  const [tasksRes, overdueRes, clientsRes, renewalsRes, anniversariesRes, eventsRes] = await Promise.all([
    supabase.from("tasks").select("id,title,status,priority,due_date,due_time,clients(name)").eq("assigned_to", user.id).eq("due_date", today).neq("status", "done").order("due_time"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assigned_to", user.id).lt("due_date", today).neq("status", "done"),
    supabase.from("clients").select("id", { count: "exact", head: true }).is("archived_at", null).eq("status", "active"),
    supabase.from("renewal_queue").select("*").gte("days_left", 0).lte("days_left", 60).order("days_left").limit(6),
    supabase.from("anniversary_queue").select("*").gte("days_left", 0).lte("days_left", 30).order("days_left").limit(6),
    supabase.from("events").select("id,title,starts_at,event_type,clients(name)").gte("starts_at", dayStart).lte("starts_at", dayEnd).order("starts_at").limit(8),
  ]);

  const tasks = tasksRes.data || [];
  const renewals = renewalsRes.data || [];
  const anniversaries = anniversariesRes.data || [];
  const events = eventsRes.data || [];

  return <div className="space-y-8">
    <SectionHeader title="Dzisiaj" description="Najważniejsze rzeczy wymagające reakcji — bez dashboardowego konfetti." action={<div className="flex gap-2"><Link className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium" href="/tasks">+ Task</Link><Link className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white" href="/crm">+ Klient</Link></div>} />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Taski na dziś" value={tasks.length} hint={`${overdueRes.count || 0} przeterminowane`} icon={CheckSquare}/>
      <StatCard label="Aktywni klienci" value={clientsRes.count || 0} hint="CRM" icon={Users}/>
      <StatCard label="Odnowienia ≤60 dni" value={renewals.length} hint="najbliższe pozycje" icon={RefreshCcw}/>
      <StatCard label="Rocznice ≤30 dni" value={anniversaries.length} hint="annual review" icon={CalendarDays}/>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><div><h2 className="font-semibold">Plan dnia</h2><p className="text-xs text-zinc-500">Taski i wydarzenia</p></div><Link href="/calendar" className="text-sm text-zinc-500 hover:text-zinc-950">Kalendarz →</Link></CardHeader><CardContent className="space-y-3">
        {events.map((event:any) => <div key={`e-${event.id}`} className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3"><div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700"><CalendarDays size={15}/></div><div className="min-w-0 flex-1"><div className="font-medium">{event.title}</div><div className="text-xs text-zinc-500">{formatDateTime(event.starts_at)}{event.clients?.name ? ` • ${event.clients.name}` : ""}</div></div></div>)}
        {tasks.map((task:any) => <Link href="/tasks" key={`t-${task.id}`} className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 hover:bg-zinc-50"><div className="mt-0.5 rounded-lg bg-zinc-100 p-2 text-zinc-700"><CheckSquare size={15}/></div><div className="min-w-0 flex-1"><div className="font-medium">{task.title}</div><div className="text-xs text-zinc-500">{task.due_time ? task.due_time.slice(0,5) : "bez godziny"}{task.clients?.name ? ` • ${task.clients.name}` : ""}</div></div><Badge variant={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : "neutral"}>{task.priority}</Badge></Link>)}
        {!events.length && !tasks.length && <EmptyState title="Czysty dzień" description="Brak wydarzeń i tasków na dzisiaj."/>}
      </CardContent></Card>

      <Card><CardHeader><div><h2 className="font-semibold">Najbliższe odnowienia</h2><p className="text-xs text-zinc-500">60-dniowe okno operacyjne</p></div><Link href="/renewals" className="text-sm text-zinc-500 hover:text-zinc-950">Wszystkie →</Link></CardHeader><CardContent className="space-y-2">
        {renewals.map((r:any) => <Link href={`/crm/${r.client_id}`} key={r.policy_id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 hover:bg-zinc-50"><div className="min-w-0"><div className="truncate font-medium">{r.client_name}</div><div className="text-xs text-zinc-500">{r.product_name || r.category} • {formatDate(r.renewal_date)}</div></div><Badge variant={r.days_left <= 14 ? "red" : r.days_left <= 30 ? "amber" : "blue"}>{r.days_left} dni</Badge></Link>)}
        {!renewals.length && <EmptyState title="Brak pilnych odnowień" description="W ciągu 60 dni nic się nie kończy."/>}
      </CardContent></Card>
    </div>

    {(overdueRes.count || 0) > 0 && <Link href="/tasks" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18}/><strong>{overdueRes.count} tasków jest po terminie.</strong><span className="text-amber-700">Warto je zamknąć albo przeplanować.</span></Link>}
  </div>;
}
