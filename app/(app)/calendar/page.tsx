import Link from "next/link";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { createEvent } from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { todayInWarsaw, warsawDayRange } from "@/lib/date";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year:"numeric", month:"2-digit", day:"2-digit" }).format(date);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const view = ["month","week","day"].includes(params.view || "") ? params.view! : "month";
  const focus = parseISO(params.date || todayInWarsaw());
  let from = focus, to = focus;
  if (view === "month") { from = startOfWeek(startOfMonth(focus), { weekStartsOn: 1 }); to = endOfWeek(endOfMonth(focus), { weekStartsOn: 1 }); }
  if (view === "week") { from = startOfWeek(focus, { weekStartsOn: 1 }); to = endOfWeek(focus, { weekStartsOn: 1 }); }
  const days = eachDayOfInterval({ start: from, end: to });
  const fromDate = format(from, "yyyy-MM-dd");
  const toDate = format(to, "yyyy-MM-dd");
  const rangeStart = warsawDayRange(fromDate).start;
  const rangeEnd = warsawDayRange(toDate).end;

  const supabase = await createClient();
  const [{ data: events }, { data: tasks }, { data: clients }] = await Promise.all([
    supabase.from("events").select("*, clients(name)").gte("starts_at", rangeStart).lte("starts_at", rangeEnd).order("starts_at"),
    supabase.from("tasks").select("id,title,due_date,due_time,status,clients(name)").gte("due_date", fromDate).lte("due_date", toDate).not("due_time","is",null).neq("status","done").order("due_time"),
    supabase.from("clients").select("id,name").is("archived_at", null).order("name").limit(500),
  ]);

  const eventMap = new Map<string, any[]>();
  (events || []).forEach((event:any) => { const k=dayKey(new Date(event.starts_at)); eventMap.set(k,[...(eventMap.get(k)||[]),{...event,kind:"event"}]); });
  (tasks || []).forEach((task:any) => { const k=task.due_date; eventMap.set(k,[...(eventMap.get(k)||[]),{...task,kind:"task"}]); });
  for (const list of eventMap.values()) list.sort((a,b)=>String(a.starts_at || a.due_time).localeCompare(String(b.starts_at || b.due_time)));

  const shift = view === "month" ? addMonths : view === "week" ? addWeeks : addDays;
  const prev = format(shift(focus,-1),"yyyy-MM-dd");
  const next = format(shift(focus,1),"yyyy-MM-dd");
  const title = view === "month" ? format(focus,"LLLL yyyy",{locale:pl}) : view === "week" ? `${format(from,"d MMM",{locale:pl})} – ${format(to,"d MMM yyyy",{locale:pl})}` : format(focus,"EEEE, d MMMM yyyy",{locale:pl});

  return <div className="space-y-7">
    <SectionHeader title="Kalendarz" description="Wydarzenia + taski, które mają konkretną godzinę." />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2"><Link className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" href={`/calendar?view=${view}&date=${prev}`}>←</Link><Link className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" href={`/calendar?view=${view}&date=${todayInWarsaw()}`}>Dzisiaj</Link><Link className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" href={`/calendar?view=${view}&date=${next}`}>→</Link></div>
      <h2 className="text-lg font-semibold capitalize">{title}</h2>
      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-white p-1">{["day","week","month"].map(v=><Link key={v} href={`/calendar?view=${v}&date=${format(focus,"yyyy-MM-dd")}`} className={`rounded-lg px-3 py-1.5 text-sm ${view===v?"bg-zinc-950 text-white":"text-zinc-500"}`}>{v === "day" ? "Dzień" : v === "week" ? "Tydzień" : "Miesiąc"}</Link>)}</div>
    </div>

    <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 font-medium">+ Dodaj wydarzenie <span className="float-right text-zinc-400 group-open:rotate-45">+</span></summary>
      <form action={createEvent} className="grid gap-4 border-t border-zinc-100 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs text-zinc-500">Tytuł</label><Input name="title" required/></div>
        <div><label className="mb-1.5 block text-xs text-zinc-500">Data</label><Input name="date" type="date" required defaultValue={format(focus,"yyyy-MM-dd")}/></div>
        <div><label className="mb-1.5 block text-xs text-zinc-500">Typ</label><Select name="event_type"><option value="meeting">Spotkanie</option><option value="call">Telefon</option><option value="follow_up">Follow-up</option><option value="private">Prywatne</option><option value="other">Inne</option></Select></div>
        <div><label className="mb-1.5 block text-xs text-zinc-500">Od</label><Input name="start_time" type="time" defaultValue="09:00" required/></div>
        <div><label className="mb-1.5 block text-xs text-zinc-500">Do</label><Input name="end_time" type="time"/></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs text-zinc-500">Klient</label><Select name="client_id"><option value="">— bez klienta —</option>{(clients||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div className="md:col-span-2 xl:col-span-4"><Textarea name="description" placeholder="Opis / agenda"/></div><div><Button>Dodaj do kalendarza</Button></div>
      </form>
    </details>

    {view === "month" ? <Card><CardContent className="p-0"><div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-xs font-medium uppercase tracking-wide text-zinc-400">{["Pon","Wt","Śr","Czw","Pt","Sob","Nd"].map(d=><div key={d} className="p-3">{d}</div>)}</div><div className="grid grid-cols-7">{days.map(day=>{const k=format(day,"yyyy-MM-dd");const list=eventMap.get(k)||[];return <div key={k} className={`min-h-32 border-b border-r border-zinc-100 p-2 ${!isSameMonth(day,focus)?"bg-zinc-50/60 text-zinc-400":"bg-white"}`}><div className={`mb-2 text-xs font-medium ${k===todayInWarsaw()?"inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-white":""}`}>{format(day,"d")}</div><div className="space-y-1">{list.slice(0,4).map((item:any)=><div key={`${item.kind}-${item.id}`} className={`truncate rounded-md px-2 py-1 text-[11px] ${item.kind==="task"?"bg-zinc-100":"bg-blue-50 text-blue-800"}`}>{item.kind==="task"?item.due_time.slice(0,5):new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw",hour:"2-digit",minute:"2-digit"}).format(new Date(item.starts_at))} {item.title}</div>)}{list.length>4&&<div className="text-[11px] text-zinc-400">+{list.length-4} więcej</div>}</div></div>})}</div></CardContent></Card> : <div className={`grid gap-4 ${view==="week"?"lg:grid-cols-7":"grid-cols-1"}`}>{days.map(day=>{const k=format(day,"yyyy-MM-dd");const list=eventMap.get(k)||[];return <Card key={k}><CardContent className="p-4"><div className="mb-3"><div className="text-xs uppercase text-zinc-400">{format(day,"EEEE",{locale:pl})}</div><div className="font-semibold">{format(day,"d MMM",{locale:pl})}</div></div><div className="space-y-2">{list.map((item:any)=><div key={`${item.kind}-${item.id}`} className="rounded-xl border border-zinc-100 p-2.5"><div className="text-xs text-zinc-400">{item.kind==="task"?item.due_time.slice(0,5):new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw",hour:"2-digit",minute:"2-digit"}).format(new Date(item.starts_at))}</div><div className="mt-1 text-sm font-medium">{item.title}</div>{item.clients?.name&&<div className="mt-1 text-xs text-zinc-500">{item.clients.name}</div>}<Badge className="mt-2" variant={item.kind==="task"?"neutral":"blue"}>{item.kind==="task"?"task":item.event_type}</Badge></div>)}{!list.length&&<div className="text-sm text-zinc-400">Brak pozycji</div>}</div></CardContent></Card>})}</div>}
  </div>;
}
