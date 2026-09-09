import Link from "next/link";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
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
import { TimePicker } from "@/components/ui/time-picker";
import { CalendarWorkspace, type CalendarItem } from "@/components/calendar-workspace";
import { cn } from "@/lib/utils";

function dateInWarsaw(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date(value));
}

function timeInWarsaw(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pl-PL", { timeZone:"Europe/Warsaw", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).format(new Date(value));
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const view = (["month","week","day"].includes(params.view || "") ? params.view! : "month") as "month"|"week"|"day";
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
  const [{ data: events }, { data: tasks }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase.from("events").select("*, clients(name)").gte("starts_at", rangeStart).lte("starts_at", rangeEnd).order("starts_at"),
    supabase.from("tasks").select("*, clients(name), profiles!tasks_assigned_to_fkey(full_name,email)").gte("due_date", fromDate).lte("due_date", toDate).not("due_time","is",null).neq("status","done").order("due_time"),
    supabase.from("clients").select("id,name").is("archived_at", null).order("name").limit(500),
    supabase.from("profiles").select("id,full_name,email").eq("is_active", true).order("full_name"),
  ]);

  const initialItems: CalendarItem[] = [
    ...(events || []).map((event:any)=>({
      id: event.id,
      kind: "event" as const,
      title: event.title,
      description: event.description,
      calendar_date: dateInWarsaw(event.starts_at),
      start_time: timeInWarsaw(event.starts_at),
      end_time: timeInWarsaw(event.ends_at) || null,
      client_id: event.client_id,
      clients: event.clients,
      event_type: event.event_type,
    })),
    ...(tasks || []).map((task:any)=>({
      id: task.id,
      kind: "task" as const,
      title: task.title,
      description: task.description,
      calendar_date: task.due_date,
      start_time: String(task.due_time || "").slice(0,5),
      end_time: null,
      client_id: task.client_id,
      clients: task.clients,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      reminder_at: task.reminder_at,
    })),
  ];

  const shift = view === "month" ? addMonths : view === "week" ? addWeeks : addDays;
  const prev = format(shift(focus,-1),"yyyy-MM-dd");
  const next = format(shift(focus,1),"yyyy-MM-dd");
  const title = view === "month" ? format(focus,"LLLL yyyy",{locale:pl}) : view === "week" ? `${format(from,"d MMM",{locale:pl})} – ${format(to,"d MMM yyyy",{locale:pl})}` : format(focus,"EEEE, d MMMM yyyy",{locale:pl});
  const focusDate = format(focus,"yyyy-MM-dd");

  const addEventForm = <form action={createEvent} data-salesly-create="event" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Tytuł</label><Input name="title" required placeholder="Np. spotkanie z ABC"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label><Input name="date" type="date" required defaultValue={focusDate}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ</label><Select name="event_type"><option value="meeting">Spotkanie</option><option value="call">Telefon</option><option value="follow_up">Follow-up</option><option value="private">Prywatne</option><option value="other">Inne</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Od</label><TimePicker name="start_time" defaultValue="09:00" required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Do</label><TimePicker name="end_time" optional/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id"><option value="">— bez klienta —</option>{(clients||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
    <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" placeholder="Agenda lub notatka"/></div>
    <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button>Dodaj wydarzenie</Button></div>
  </form>;

  return <div className="space-y-6">
    <SectionHeader title="Kalendarz" action={<FormDisclosure label="Dodaj wydarzenie" align="right">{addEventForm}</FormDisclosure>} />

    <div className="flex flex-col gap-4 rounded-[18px] border border-[#dfe6ee] bg-white p-3 shadow-[0_1px_2px_rgba(28,44,60,.03)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1.5">
        <Link aria-label="Poprzedni okres" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ed] text-[#657580] transition-all hover:-translate-y-px hover:bg-[#f5f8fa] active:scale-95" href={`/calendar?view=${view}&date=${prev}`}><ChevronLeft size={17}/></Link>
        <Link className="inline-flex h-9 items-center rounded-xl border border-[#e1e7ed] px-3 text-sm font-semibold text-[#485965] transition-all hover:-translate-y-px hover:bg-[#f5f8fa] active:scale-[.98]" href={`/calendar?view=${view}&date=${todayInWarsaw()}`}>Dzisiaj</Link>
        <Link aria-label="Następny okres" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e1e7ed] text-[#657580] transition-all hover:-translate-y-px hover:bg-[#f5f8fa] active:scale-95" href={`/calendar?view=${view}&date=${next}`}><ChevronRight size={17}/></Link>
      </div>
      <div className="flex items-center gap-2"><CalendarDays size={17} className="text-[#568deb]"/><h2 className="text-base font-bold capitalize text-[#30404b] sm:text-lg">{title}</h2></div>
      <div className="flex rounded-xl bg-[#f1f4f8] p-1">
        {["day","week","month"].map(v=><Link key={v} href={`/calendar?view=${v}&date=${focusDate}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 active:scale-[.98]", view===v ? "bg-[#e8f0ff] text-[#315fc9] shadow-sm ring-1 ring-[#d5e2ff]" : "text-[#72828e] hover:bg-white hover:text-[#40515d]")}>{v === "day" ? "Dzień" : v === "week" ? "Tydzień" : "Miesiąc"}</Link>)}
      </div>
    </div>

    <CalendarWorkspace view={view} days={days.map(day=>format(day,"yyyy-MM-dd"))} focusDate={focusDate} today={todayInWarsaw()} initialItems={initialItems} clients={(clients || []) as any[]} profiles={(profiles || []) as any[]}/>
  </div>;
}
