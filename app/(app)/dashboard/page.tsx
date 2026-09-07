import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, CalendarDays, CheckSquare2, Clock3, Plus, RefreshCcw, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { todayInWarsaw, warsawDayRange } from "@/lib/date";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils";

function priorityLabel(priority: string) {
  return priority === "urgent" ? "Pilne" : priority === "high" ? "Wysokie" : priority === "low" ? "Niskie" : "Normalne";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const today = todayInWarsaw();
  const { start: dayStart, end: dayEnd } = warsawDayRange(today);

  const [tasksRes, overdueRes, clientsRes, renewalsRes, anniversariesRes, eventsRes, notificationsRes, activityRes] = await Promise.all([
    supabase.from("tasks").select("id,title,status,priority,due_date,due_time,clients(name)").eq("assigned_to", user.id).eq("due_date", today).neq("status", "done").order("due_time"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assigned_to", user.id).lt("due_date", today).neq("status", "done"),
    supabase.from("clients").select("id", { count: "exact", head: true }).is("archived_at", null).eq("status", "active"),
    supabase.from("renewal_queue").select("*").gte("days_left", 0).lte("days_left", 60).order("days_left").limit(5),
    supabase.from("anniversary_queue").select("*").gte("days_left", 0).lte("days_left", 30).order("days_left").limit(5),
    supabase.from("events").select("id,title,starts_at,event_type,clients(name)").gte("starts_at", dayStart).lte("starts_at", dayEnd).order("starts_at").limit(12),
    supabase.from("notifications").select("id,title,body,href,created_at,read_at").eq("user_id", user.id).is("read_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("activities").select("id,title,activity_type,occurred_at,clients(id,name)").order("occurred_at", { ascending: false }).limit(5),
  ]);

  const tasks = tasksRes.data || [];
  const renewals = renewalsRes.data || [];
  const anniversaries = anniversariesRes.data || [];
  const events = eventsRes.data || [];
  const meetings = events.filter((event: any) => event.event_type === "meeting" && event.clients?.name);
  const notifications = notificationsRes.data || [];
  const activities = activityRes.data || [];

  return <div className="space-y-7">
    <SectionHeader
      title="Dashboard"
      action={<>
        <Link href="/tasks" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe6ee] bg-white px-4 text-sm font-semibold text-[#35444f] shadow-sm transition hover:bg-[#f8fafc]"><Plus size={16}/> Zadanie</Link>
        <Link href="/calendar" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce6ff] bg-[#eef3ff] px-4 text-sm font-semibold text-[#456edb] transition hover:bg-[#e5edff]"><Plus size={16}/> Wydarzenie</Link>
        <Link href="/crm" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4f78e7] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-[#426dde]"><Plus size={16}/> Klient</Link>
      </>}
    />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Zadania na dziś" value={tasks.length} hint={`${overdueRes.count || 0} po terminie`} icon={CheckSquare2} tone="blue"/>
      <StatCard label="Spotkania dziś" value={meetings.length} hint="z klientami" icon={CalendarClock} tone="green"/>
      <StatCard label="Odnowienia" value={renewals.length} hint="w ciągu 60 dni" icon={RefreshCcw} tone="amber"/>
      <StatCard label="Aktywni klienci" value={clientsRes.count || 0} hint={`${anniversaries.length} rocznic do 30 dni`} icon={Users} tone="slate"/>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><CheckSquare2 size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Zadania na dziś</h2><div className="text-xs text-[#83909b]">{tasks.length} aktywnych</div></div></div>
          <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5e75a9] hover:text-[#456edb]">Wszystkie <ArrowRight size={15}/></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((task:any) => <Link href="/tasks" key={task.id} className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-[#e5eaf0] hover:bg-[#f8fafc]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f3f6] text-[#61717e]"><Clock3 size={16}/></div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-[#34434e] group-hover:text-[#25343f]">{task.title}</div><div className="mt-0.5 text-xs text-[#84919c]">{task.due_time ? task.due_time.slice(0,5) : "bez godziny"}{task.clients?.name ? ` · ${task.clients.name}` : ""}</div></div>
            <Badge variant={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : task.priority === "normal" ? "blue" : "neutral"}>{priorityLabel(task.priority)}</Badge>
          </Link>)}
          {!tasks.length && <EmptyState title="Brak zadań na dziś" description="Dzisiejsza lista jest pusta."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><CalendarClock size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Dzisiejsze spotkania</h2><div className="text-xs text-[#83909b]">spotkania z klientami</div></div></div>
          <Link href="/calendar" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5e75a9] hover:text-[#456edb]">Kalendarz <ArrowRight size={15}/></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {meetings.map((event:any) => <Link key={event.id} href="/calendar" className="flex items-center gap-3 rounded-xl border border-[#edf1f5] bg-[#fbfcfd] p-3 transition hover:border-[#dce3eb] hover:bg-white">
            <div className="min-w-[58px] rounded-xl bg-white px-2 py-2 text-center shadow-sm ring-1 ring-[#e8edf2]"><div className="text-sm font-bold text-[#35444f]">{new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw",hour:"2-digit",minute:"2-digit"}).format(new Date(event.starts_at))}</div></div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#34434e]">{event.title}</div><div className="mt-0.5 truncate text-xs text-[#84919c]">{event.clients?.name}</div></div>
          </Link>)}
          {!meetings.length && <EmptyState title="Brak spotkań" description="Na dziś nie ma zaplanowanych spotkań z klientami."/>}
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><RefreshCcw size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe odnowienia</h2><div className="text-xs text-[#83909b]">60 dni</div></div></div><Link href="/renewals" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5e75a9] hover:text-[#456edb]">Wszystkie <ArrowRight size={15}/></Link></CardHeader>
        <CardContent className="space-y-2">
          {renewals.map((r:any) => <Link href={`/crm/${r.client_id}`} key={r.policy_id} className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-[#e5eaf0] hover:bg-[#f8fafc]"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#34434e]">{r.client_name}</div><div className="mt-0.5 text-xs text-[#84919c]">{r.product_name || r.category} · {formatDate(r.renewal_date)}</div></div><Badge variant={r.days_left <= 14 ? "red" : r.days_left <= 30 ? "amber" : "blue"}>{r.days_left} dni</Badge></Link>)}
          {!renewals.length && <EmptyState title="Brak odnowień" description="W ciągu 60 dni nie ma pozycji do obsługi."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><CalendarDays size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Rocznice</h2><div className="text-xs text-[#83909b]">30 dni</div></div></div><Link href="/renewals" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5e75a9] hover:text-[#456edb]">Wszystkie <ArrowRight size={15}/></Link></CardHeader>
        <CardContent className="space-y-2">
          {anniversaries.map((r:any) => <Link href={`/crm/${r.client_id}`} key={r.policy_id} className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-[#e5eaf0] hover:bg-[#f8fafc]"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#34434e]">{r.client_name}</div><div className="mt-0.5 text-xs text-[#84919c]">{r.product_name || r.category} · {formatDate(r.anniversary_date)}</div></div><Badge variant={r.days_left <= 7 ? "amber" : "blue"}>{r.days_left} dni</Badge></Link>)}
          {!anniversaries.length && <EmptyState title="Brak rocznic" description="W ciągu 30 dni nie ma rocznic polis."/>}
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-[#f0f3f6] p-2 text-[#657580]"><Users size={18}/></div><h2 className="font-bold text-[#2a3944]">Ostatnia aktywność klientów</h2></div></CardHeader>
        <CardContent className="space-y-1">
          {activities.map((a:any) => <Link key={a.id} href={a.clients?.id ? `/crm/${a.clients.id}` : "/crm"} className="flex items-center justify-between gap-4 rounded-xl px-2 py-2.5 transition hover:bg-[#f8fafc]"><div className="min-w-0"><div className="truncate text-sm font-semibold text-[#34434e]">{a.title}</div><div className="mt-0.5 truncate text-xs text-[#84919c]">{a.clients?.name || "CRM"}</div></div><div className="shrink-0 text-xs text-[#9aa5ae]">{formatDateTime(a.occurred_at)}</div></Link>)}
          {!activities.length && <EmptyState title="Brak aktywności" description="Historia klientów pojawi się tutaj po pierwszych wpisach."/>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-3"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><Bell size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Powiadomienia</h2><div className="text-xs text-[#83909b]">nieprzeczytane</div></div></div><Link href="/notifications" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5e75a9] hover:text-[#456edb]">Wszystkie <ArrowRight size={15}/></Link></CardHeader>
        <CardContent className="space-y-2">
          {notifications.map((n:any) => <Link key={n.id} href={n.href || "/notifications"} className="block rounded-xl border border-[#e7ecf2] bg-[#fbfcfe] p-3 transition hover:border-[#dce3eb] hover:bg-white"><div className="text-sm font-semibold text-[#34434e]">{n.title}</div>{n.body && <div className="mt-1 line-clamp-1 text-xs text-[#84919c]">{n.body}</div>}</Link>)}
          {!notifications.length && <EmptyState title="Wszystko przeczytane" description="Nie masz nowych powiadomień."/>}
        </CardContent>
      </Card>
    </div>
  </div>;
}
