"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { format, isSameMonth, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { GripVertical } from "lucide-react";
import { rescheduleEvent, updateEvent } from "@/lib/actions/events";
import { rescheduleTask, updateTask } from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { cn } from "@/lib/utils";

type ClientOption = { id: string; name: string };
type ProfileOption = { id: string; full_name?: string | null; email?: string | null };

export type CalendarItem = {
  id: string;
  kind: "task" | "event";
  title: string;
  description?: string | null;
  calendar_date: string;
  start_time: string;
  end_time?: string | null;
  client_id?: string | null;
  clients?: { name?: string | null } | null;
  event_type?: string | null;
  status?: "todo"|"in_progress"|"waiting"|"done";
  priority?: "low"|"normal"|"high"|"urgent";
  assigned_to?: string | null;
  reminder_at?: string | null;
};

function itemStyle(item: CalendarItem) {
  if (item.kind === "task") return "border-[#e2e8ef] border-l-[#9aa9b6] bg-[#f6f8fa] text-[#52636f]";
  if (item.event_type === "meeting") return "border-[#d9e6ff] border-l-[#568deb] bg-[#edf3ff] text-[#3768d1]";
  if (item.event_type === "call") return "border-emerald-100 border-l-emerald-500 bg-emerald-50/80 text-emerald-700";
  if (item.event_type === "follow_up") return "border-amber-100 border-l-amber-500 bg-amber-50/80 text-amber-700";
  if (item.event_type === "private") return "border-violet-100 border-l-violet-500 bg-violet-50/80 text-violet-700";
  return "border-sky-100 border-l-sky-500 bg-sky-50/80 text-sky-700";
}

function itemLabel(item: CalendarItem) {
  if (item.kind === "task") return "Zadanie";
  if (item.event_type === "meeting") return "Spotkanie";
  if (item.event_type === "call") return "Telefon";
  if (item.event_type === "follow_up") return "Follow-up";
  if (item.event_type === "private") return "Prywatne";
  return "Wydarzenie";
}

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find(part=>part.type===type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function DraggableCalendarItem({ item, compact = false, onOpen }: { item: CalendarItem; compact?: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${item.kind}:${item.id}`, data: { item } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 } : undefined;
  return <button ref={setNodeRef} style={style} type="button" onClick={onOpen} {...listeners} {...attributes} className={cn("group relative w-full cursor-grab border border-l-[3px] text-left shadow-[0_1px_2px_rgba(31,48,65,.025)] transition-all duration-200 hover:-translate-y-px hover:brightness-[.99] hover:shadow-[0_7px_18px_rgba(31,48,65,.08)] active:cursor-grabbing", compact ? "truncate rounded-lg px-2 py-1.5 text-[11px] font-semibold" : "rounded-xl p-3", itemStyle(item), isDragging && "opacity-25")}>
    {compact ? <><span className="mr-1 opacity-70">{item.start_time}</span>{item.title}</> : <>
      <div className="flex items-center justify-between gap-2"><div className="text-xs font-bold opacity-75">{item.start_time}</div><div className="flex items-center gap-1"><Badge className="bg-white/70" variant={item.kind==="task"?"neutral":"blue"}>{itemLabel(item)}</Badge><GripVertical size={13} className="opacity-0 transition group-hover:opacity-60"/></div></div>
      <div className="mt-1.5 text-sm font-bold">{item.title}</div>{item.clients?.name&&<div className="mt-1 text-xs opacity-75">{item.clients.name}</div>}
    </>}
  </button>;
}

function DroppableDay({ date, className, children }: { date: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  return <div ref={setNodeRef} className={cn("transition-all duration-200", className, isOver && "bg-[#edf4ff] ring-2 ring-inset ring-[#bcd0f7]")}>{children}</div>;
}

export function CalendarWorkspace({
  view,
  days,
  focusDate,
  today,
  initialItems,
  clients,
  profiles,
}: {
  view: "day"|"week"|"month";
  days: string[];
  focusDate: string;
  today: string;
  initialItems: CalendarItem[];
  clients: ClientOption[];
  profiles: ProfileOption[];
}) {
  const [items, setItems] = useState(initialItems);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }));
  const selected = items.find(item=>`${item.kind}:${item.id}`===selectedKey) || null;
  const active = items.find(item=>`${item.kind}:${item.id}`===activeKey) || null;
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    items.forEach(item=>map.set(item.calendar_date,[...(map.get(item.calendar_date)||[]),item]));
    for (const list of map.values()) list.sort((a,b)=>a.start_time.localeCompare(b.start_time));
    return map;
  }, [items]);

  function onDragEnd(event: DragEndEvent) {
    setActiveKey(null);
    const overId = event.over ? String(event.over.id) : "";
    if (!overId.startsWith("day:")) return;
    const targetDate = overId.replace("day:", "");
    const [kind, id] = String(event.active.id).split(":") as ["task"|"event",string];
    const item = items.find(candidate=>candidate.kind===kind && candidate.id===id);
    if (!item || item.calendar_date===targetDate) return;
    const previous = items;
    setItems(current=>current.map(candidate=>candidate.kind===kind&&candidate.id===id ? { ...candidate, calendar_date: targetDate } : candidate));
    startTransition(async ()=>{
      try {
        if (kind === "task") await rescheduleTask(id,targetDate);
        else await rescheduleEvent(id,targetDate,item.start_time,item.end_time);
        router.refresh();
      } catch {
        setItems(previous);
      }
    });
  }

  function saveSelected(formData: FormData) {
    if (!selected) return;
    const previous = items;
    if (selected.kind === "event") {
      const clientId = String(formData.get("client_id") || "") || null;
      const next: CalendarItem = {
        ...selected,
        title: String(formData.get("title") || selected.title),
        description: String(formData.get("description") || "") || null,
        event_type: String(formData.get("event_type") || "other"),
        client_id: clientId,
        clients: clientId ? { name: clients.find(client=>client.id===clientId)?.name || "" } : null,
        calendar_date: String(formData.get("date") || selected.calendar_date),
        start_time: String(formData.get("start_time") || selected.start_time),
        end_time: String(formData.get("end_time") || "") || null,
      };
      setItems(current=>current.map(item=>item.kind==="event"&&item.id===selected.id ? next : item));
      setSelectedKey(null);
      startTransition(async ()=>{
        try { await updateEvent(selected.id,formData); router.refresh(); }
        catch { setItems(previous); }
      });
      return;
    }
    const clientId = String(formData.get("client_id") || "") || null;
    const next: CalendarItem = {
      ...selected,
      title: String(formData.get("title") || selected.title),
      description: String(formData.get("description") || "") || null,
      status: String(formData.get("status") || selected.status || "todo") as CalendarItem["status"],
      priority: String(formData.get("priority") || selected.priority || "normal") as CalendarItem["priority"],
      assigned_to: String(formData.get("assigned_to") || "") || null,
      client_id: clientId,
      clients: clientId ? { name: clients.find(client=>client.id===clientId)?.name || "" } : null,
      calendar_date: String(formData.get("due_date") || selected.calendar_date),
      start_time: String(formData.get("due_time") || selected.start_time),
      reminder_at: String(formData.get("reminder_at") || "") || null,
    };
    setItems(current=>next.status === "done" ? current.filter(item=>!(item.kind==="task"&&item.id===selected.id)) : current.map(item=>item.kind==="task"&&item.id===selected.id ? next : item));
    setSelectedKey(null);
    startTransition(async ()=>{
      try { await updateTask(selected.id,formData); router.refresh(); }
      catch { setItems(previous); }
    });
  }

  const focus = parseISO(focusDate);

  return <>
    <DndContext sensors={sensors} onDragStart={(event)=>setActiveKey(String(event.active.id))} onDragCancel={()=>setActiveKey(null)} onDragEnd={onDragEnd}>
      {view === "month" ? <div className="overflow-x-auto rounded-[20px] border border-[#dfe6ee] bg-white shadow-[0_8px_28px_rgba(30,48,64,.035)] salesly-scrollbar">
        <div className="min-w-[850px]">
          <div className="grid grid-cols-7 border-b border-[#e8edf2] bg-[#f7f9fc] text-center text-[11px] font-bold uppercase tracking-[0.11em] text-[#8b98a3]">{["Pon","Wt","Śr","Czw","Pt","Sob","Nd"].map(day=><div key={day} className="p-3">{day}</div>)}</div>
          <div className="grid grid-cols-7">{days.map(date=>{
            const day=parseISO(date); const list=grouped.get(date)||[]; const isToday=date===today;
            return <DroppableDay key={date} date={date} className={cn("min-h-[142px] border-b border-r border-[#edf1f5] p-2.5 hover:bg-[#f8fbff]", !isSameMonth(day,focus) ? "bg-[#fafbfd] text-[#a7b1b9]" : isToday ? "bg-[#f7faff]" : "bg-white")}>
              <div className="mb-2 flex items-center justify-between"><div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", isToday ? "bg-[#568deb] text-white shadow-sm shadow-blue-100" : "text-[#586873]")}>{format(day,"d")}</div>{list.length>0&&<span className="text-[10px] font-semibold text-[#9aa5ae]">{list.length}</span>}</div>
              <div className="space-y-1.5">{list.slice(0,4).map(item=><DraggableCalendarItem key={`${item.kind}:${item.id}`} item={item} compact onOpen={()=>setSelectedKey(`${item.kind}:${item.id}`)}/>)}{list.length>4&&<div className="px-1 text-[11px] font-semibold text-[#7e8c97]">+{list.length-4} więcej</div>}</div>
            </DroppableDay>;
          })}</div>
        </div>
      </div> : <div className={cn("grid gap-4", view==="week" ? "lg:grid-cols-7" : "grid-cols-1")}>
        {days.map(date=>{const day=parseISO(date);const list=grouped.get(date)||[];const isToday=date===today;return <DroppableDay key={date} date={date} className={cn("rounded-[18px] border bg-white p-4 shadow-[0_4px_18px_rgba(30,48,64,.03)]", isToday ? "border-[#cbdcff] bg-[#f8fbff] ring-2 ring-[#edf3ff]" : "border-[#dfe6ee]")}>
          <div className="mb-4 flex items-center justify-between lg:block"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b98a3]">{format(day,"EEEE",{locale:pl})}</div><div className="mt-0.5 text-sm font-bold text-[#33434e]">{format(day,"d MMM",{locale:pl})}</div></div>
          <div className="space-y-2.5">{list.map(item=><DraggableCalendarItem key={`${item.kind}:${item.id}`} item={item} onOpen={()=>setSelectedKey(`${item.kind}:${item.id}`)}/>)}{!list.length&&<div className="rounded-xl border border-dashed border-[#dfe5eb] px-3 py-7 text-center text-xs text-[#9aa5ae]">Przeciągnij tutaj lub dodaj pozycję</div>}</div>
        </DroppableDay>})}
      </div>}
      <DragOverlay dropAnimation={{ duration: 170, easing: "cubic-bezier(.2,.8,.2,1)" }}>{active ? <div className={cn("w-[250px] rotate-[1deg] rounded-xl border border-l-[3px] p-3 shadow-[0_18px_45px_rgba(28,44,60,.18)]",itemStyle(active))}><div className="text-xs font-bold opacity-70">{active.start_time} · {itemLabel(active)}</div><div className="mt-1 font-bold">{active.title}</div></div> : null}</DragOverlay>
    </DndContext>

    <Modal open={Boolean(selected)} onClose={()=>setSelectedKey(null)} title={selected?.title || "Pozycja kalendarza"} eyebrow={selected ? itemLabel(selected) : undefined}>
      {selected?.kind === "event" && <form key={`event-${selected.id}`} onSubmit={(event)=>{event.preventDefault();saveSelected(new FormData(event.currentTarget));}} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Tytuł</label><Input name="title" required defaultValue={selected.title}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Data</label><Input name="date" type="date" required defaultValue={selected.calendar_date}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ</label><Select name="event_type" defaultValue={selected.event_type || "other"}><option value="meeting">Spotkanie</option><option value="call">Telefon</option><option value="follow_up">Follow-up</option><option value="private">Prywatne</option><option value="other">Inne</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Od</label><TimePicker name="start_time" defaultValue={selected.start_time} required/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Do</label><TimePicker name="end_time" defaultValue={selected.end_time} optional/></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id" defaultValue={selected.client_id || ""}><option value="">— bez klienta —</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</Select></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" rows={5} defaultValue={selected.description || ""}/></div>
        <div className="md:col-span-2 flex justify-end gap-2 border-t border-[#edf1f5] pt-4"><Button type="button" variant="secondary" onClick={()=>setSelectedKey(null)}>Anuluj</Button><Button type="submit">Zapisz zmiany</Button></div>
      </form>}
      {selected?.kind === "task" && <form key={`task-${selected.id}`} onSubmit={(event)=>{event.preventDefault();saveSelected(new FormData(event.currentTarget));}} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa</label><Input name="title" required defaultValue={selected.title}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Status</label><Select name="status" defaultValue={selected.status || "todo"}><option value="todo">Do zrobienia</option><option value="in_progress">W trakcie</option><option value="waiting">Oczekuje</option><option value="done">Gotowe</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Priorytet</label><Select name="priority" defaultValue={selected.priority || "normal"}><option value="low">Niski</option><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Termin</label><Input name="due_date" type="date" defaultValue={selected.calendar_date}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Godzina</label><TimePicker name="due_time" defaultValue={selected.start_time} required/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypisz</label><Select name="assigned_to" defaultValue={selected.assigned_to || ""}>{profiles.map(profile=><option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>)}</Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id" defaultValue={selected.client_id || ""}><option value="">— bez klienta —</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</Select></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypomnienie</label><DateTimePicker name="reminder_at" defaultValue={localDateTime(selected.reminder_at)}/></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" rows={5} defaultValue={selected.description || ""}/></div>
        <div className="md:col-span-2 flex justify-end gap-2 border-t border-[#edf1f5] pt-4"><Button type="button" variant="secondary" onClick={()=>setSelectedKey(null)}>Anuluj</Button><Button type="submit">Zapisz zmiany</Button></div>
      </form>}
    </Modal>
  </>;
}
