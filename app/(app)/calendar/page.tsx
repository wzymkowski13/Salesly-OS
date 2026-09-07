import Link from "next/link";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createEvent } from "@/lib/actions/events";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { todayInWarsaw, warsawDayRange } from "@/lib/date";
import { SectionHeader } from "@/components/section-header";
import { FormDisclosure } from "@/components/form-disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year:"numeric", month:"2-digit", day:"2-digit" }).format(date);
}

function itemStyle(item: any) {
  if (item.kind === "task") return "border-[#e2e8ef] border-l-[#9aa9b6] bg-[#f6f8fa] text-[#52636f]";
  if (item.event_type === "meeting") return "border-[#d9e6ff] border-l-[#568deb] bg-[#edf3ff] text-[#3768d1]";
  if (item.event_type === "call") return "border-emerald-100 border-l-emerald-500 bg-emerald-50/80 text-emerald-700";
  if (item.event_type === "follow_up") return "border-amber-100 border-l-amber-500 bg-amber-50/80 text-amber-700";
  return "border-violet-100 border-l-violet-500 bg-violet-50/80 text-violet-700";
}

function itemLabel(item: any) {
  if (item.kind === "task") return "Zadanie";
  if (item.event_type === "meeting") return "Spotkanie";
  if (item.event_type === "call") return "Telefon";
  if (item.event_type === "follow_up") return "Follow-up";
  if (item.event_type === "private") return "Prywatne";
  return "Wydarzenie";
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
  const focusDate = format(focus,"yyyy-MM-dd");

  const addEventForm = <form action={createEvent} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Tytuł</label><Input name="title" required placeholder="Np. spotkanie z ABC"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label><Input name="date" type="date" required defaultValue={focusDate}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ</label><Select name="event_type"><option value="meeting">Spotkanie</option><option value="call">Telefon</option><option value="follow_up">Follow-up</option><option value="private">Prywatne</option><option value="other">Inne</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Od</label><Input name="start_time" type="time" defaultValue="09:00" required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Do</label><Input name="end_time" type="time"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id"><option value="">— bez klienta —</option>{(clients||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
    <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" placeholder="Agenda lub notatka"/></div>
    <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button>Dodaj wydarzenie</Button></div>
  </form>;

  return <div className="space-y-6">
    <SectionHeader title="Kalendarz" action={<FormDisclosure label="Dodaj wydarzenie" align="right">{addEventForm}</FormDisclosure>} />

    <div className="flex flex-col gap-4 rounded-[18px] border border-[#dfe6ee] bg-white p-3 shadow-[0_1px_2px_rgba(28,44,60,.03)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1.5">
        <Link aria-label="Poprzedni okres" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ed] text-[#657580] transition hover:bg-[#f5f8fa]" href={`/calendar?view=${view}&date=${prev}`}><ChevronLeft size={17}/></Link>
        <Link className="inline-flex h-9 items-center rounded-xl border border-[#e1e7ed] px-3 text-sm font-semibold text-[#485965] transition hover:bg-[#f5f8fa]" href={`/calendar?view=${view}&date=${todayInWarsaw()}`}>Dzisiaj</Link>
        <Link aria-label="Następny okres" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ed] text-[#657580] transition hover:bg-[#f5f8fa]" href={`/calendar?view=${view}&date=${next}`}><ChevronRight size={17}/></Link>
      </div>
      <div className="flex items-center gap-2"><CalendarDays size={17} className="text-[#568deb]"/><h2 className="text-base font-bold capitalize text-[#30404b] sm:text-lg">{title}</h2></div>
      <div className="flex rounded-xl bg-[#f1f4f8] p-1">
        {["day","week","month"].map(v=><Link key={v} href={`/calendar?view=${v}&date=${focusDate}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition-all", view===v ? "bg-[#e8f0ff] text-[#315fc9] shadow-sm ring-1 ring-[#d5e2ff]" : "text-[#72828e] hover:bg-white hover:text-[#40515d]")}>{v === "day" ? "Dzień" : v === "week" ? "Tydzień" : "Miesiąc"}</Link>)}
      </div>
    </div>

    {view === "month" ? <div className="overflow-x-auto rounded-[20px] border border-[#dfe6ee] bg-white shadow-[0_8px_28px_rgba(30,48,64,.035)] salesly-scrollbar">
      <div className="min-w-[850px]">
        <div className="grid grid-cols-7 border-b border-[#e8edf2] bg-[#f7f9fc] text-center text-[11px] font-bold uppercase tracking-[0.11em] text-[#8b98a3]">{["Pon","Wt","Śr","Czw","Pt","Sob","Nd"].map(d=><div key={d} className="p-3">{d}</div>)}</div>
        <div className="grid grid-cols-7">{days.map(day=>{
          const k=format(day,"yyyy-MM-dd"); const list=eventMap.get(k)||[]; const today = k===todayInWarsaw();
          return <div key={k} className={cn("min-h-[142px] border-b border-r border-[#edf1f5] p-2.5 transition-colors hover:bg-[#f8fbff]", !isSameMonth(day,focus) ? "bg-[#fafbfd] text-[#a7b1b9]" : today ? "bg-[#f7faff]" : "bg-white")}>
            <div className="mb-2 flex items-center justify-between"><div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", today ? "bg-[#568deb] text-white shadow-sm shadow-blue-100" : "text-[#586873]")}>{format(day,"d")}</div>{list.length > 0 && <span className="text-[10px] font-semibold text-[#9aa5ae]">{list.length}</span>}</div>
            <div className="space-y-1.5">{list.slice(0,4).map((item:any)=><div key={`${item.kind}-${item.id}`} className={cn("truncate rounded-lg border border-l-[3px] px-2 py-1.5 text-[11px] font-semibold shadow-[0_1px_2px_rgba(31,48,65,.025)]", itemStyle(item))}><span className="mr-1 opacity-70">{item.kind==="task" ? item.due_time.slice(0,5) : new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw",hour:"2-digit",minute:"2-digit"}).format(new Date(item.starts_at))}</span>{item.title}</div>)}{list.length>4&&<div className="px-1 text-[11px] font-semibold text-[#7e8c97]">+{list.length-4} więcej</div>}</div>
          </div>})}</div>
      </div>
    </div> : <div className={cn("grid gap-4", view==="week" ? "lg:grid-cols-7" : "grid-cols-1")}>
      {days.map(day=>{const k=format(day,"yyyy-MM-dd");const list=eventMap.get(k)||[];const today=k===todayInWarsaw();return <div key={k} className={cn("rounded-[18px] border bg-white p-4 shadow-[0_4px_18px_rgba(30,48,64,.03)]", today ? "border-[#cbdcff] bg-[#f8fbff] ring-2 ring-[#edf3ff]" : "border-[#dfe6ee]")}>
        <div className="mb-4 flex items-center justify-between lg:block"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b98a3]">{format(day,"EEEE",{locale:pl})}</div><div className="mt-0.5 text-sm font-bold text-[#33434e]">{format(day,"d MMM",{locale:pl})}</div></div>
        <div className="space-y-2.5">{list.map((item:any)=><div key={`${item.kind}-${item.id}`} className={cn("rounded-xl border border-l-[3px] p-3 shadow-[0_1px_2px_rgba(31,48,65,.025)]", itemStyle(item))}><div className="flex items-center justify-between gap-2"><div className="text-xs font-bold opacity-75">{item.kind==="task"?item.due_time.slice(0,5):new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw",hour:"2-digit",minute:"2-digit"}).format(new Date(item.starts_at))}</div><Badge className="bg-white/70" variant={item.kind==="task"?"neutral":"blue"}>{itemLabel(item)}</Badge></div><div className="mt-1.5 text-sm font-bold">{item.title}</div>{item.clients?.name&&<div className="mt-1 text-xs opacity-75">{item.clients.name}</div>}</div>)}{!list.length&&<div className="rounded-xl border border-dashed border-[#dfe5eb] px-3 py-7 text-center text-xs text-[#9aa5ae]">Brak pozycji</div>}</div>
      </div>})}
    </div>}
  </div>;
}
