"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Check, Clock3, GripVertical, PauseCircle, PlayCircle } from "lucide-react";
import { setTaskStatus, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { TimePicker } from "@/components/ui/time-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { cn, formatDate } from "@/lib/utils";

export type TaskBoardTask = {
  id: string;
  title: string;
  description?: string | null;
  status: "todo"|"in_progress"|"waiting"|"done";
  priority: "low"|"normal"|"high"|"urgent";
  assigned_to?: string | null;
  client_id?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  reminder_at?: string | null;
  clients?: { name?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

type Option = { id: string; name?: string | null; full_name?: string | null; email?: string | null };

const columns = [
  ["todo", "Do zrobienia", Clock3, "bg-[#eef3ff] text-[#4f78e7]"],
  ["in_progress", "W trakcie", PlayCircle, "bg-emerald-50 text-emerald-600"],
  ["waiting", "Oczekuje", PauseCircle, "bg-amber-50 text-amber-600"],
  ["done", "Gotowe", Check, "bg-[#f0f3f6] text-[#637480]"],
] as const;

const pointerFirstCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length ? pointerHits : rectIntersection(args);
};

function priorityLabel(priority: string) {
  return priority === "urgent" ? "Pilne" : priority === "high" ? "Wysokie" : priority === "low" ? "Niskie" : "Normalne";
}

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find(part=>part.type===type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function DraggableTaskCard({ task, onOpen, onStatus }: { task: TaskBoardTask; onOpen: () => void; onStatus: (status: TaskBoardTask["status"]) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task:${task.id}`, data: { taskId: task.id } });
  return <div
    ref={setNodeRef}
    onClick={onOpen}
    {...listeners}
    {...attributes}
    className={cn(
      "salesly-task-card group cursor-grab touch-none select-none rounded-2xl border border-[#e3e9f0] bg-white p-4 shadow-[0_2px_10px_rgba(34,49,60,.025)] transition-[border-color,box-shadow,opacity,transform] duration-150 hover:-translate-y-0.5 hover:border-[#d6e1ec] hover:shadow-[0_10px_28px_rgba(34,49,60,.08)] active:cursor-grabbing",
      isDragging && "opacity-25"
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 font-semibold leading-5 text-[#32414c]">{task.title}</div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : task.priority === "low" ? "neutral" : "blue"}>{priorityLabel(task.priority)}</Badge>
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9ba9b4] opacity-55 transition group-hover:bg-[#f1f5f8] group-hover:text-[#5e7180] group-hover:opacity-100"><GripVertical size={15}/></span>
      </div>
    </div>
    {task.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#768590]">{task.description}</p>}
    <div className="mt-3 space-y-1 text-xs text-[#84919c]"><div>{task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ` · ${task.due_time.slice(0,5)}` : ""}` : "Bez terminu"}</div>{task.clients?.name && <div>{task.clients.name}</div>}<div>{task.profiles?.full_name || task.profiles?.email || "—"}</div></div>
    <div className="mt-4 flex flex-wrap gap-1.5" onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>event.stopPropagation()}>
      {task.status !== "in_progress" && task.status !== "done" && <Button variant="soft" size="sm" type="button" onClick={()=>onStatus("in_progress")}>W trakcie</Button>}
      {task.status !== "waiting" && task.status !== "done" && <Button variant="ghost" size="sm" type="button" onClick={()=>onStatus("waiting")}>Oczekuje</Button>}
      {task.status !== "done" && <Button size="sm" type="button" onClick={()=>onStatus("done")}><Check size={14}/> Gotowe</Button>}
      {task.status === "done" && <Button variant="secondary" size="sm" type="button" onClick={()=>onStatus("todo")}>Przywróć</Button>}
    </div>
  </div>;
}

function TaskColumn({ status, label, Icon, tone, tasks, onOpen, onStatus }: { status: TaskBoardTask["status"]; label: string; Icon: typeof Clock3; tone: string; tasks: TaskBoardTask[]; onOpen: (task: TaskBoardTask)=>void; onStatus: (task: TaskBoardTask,status:TaskBoardTask["status"])=>void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  return <section ref={setNodeRef} className={cn("min-w-0 rounded-[20px] border border-[#dfe6ee] bg-[#fbfcfe] shadow-[0_1px_2px_rgba(28,44,60,.025)] transition-all duration-200", isOver && "border-[#afc8f7] bg-[#f4f8ff] ring-4 ring-[#568deb]/5")}>
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
      <div className="flex items-center gap-2.5"><div className={`rounded-xl p-2 ${tone}`}><Icon size={16}/></div><h2 className="text-sm font-bold text-[#34434e]">{label}</h2></div><Badge>{tasks.length}</Badge>
    </div>
    <div className="min-h-[160px] space-y-3 p-4 pt-2">
      {tasks.map(task=><DraggableTaskCard key={task.id} task={task} onOpen={()=>onOpen(task)} onStatus={(next)=>onStatus(task,next)}/>)}
      {!tasks.length && <EmptyState title={isOver ? "Upuść tutaj" : "Pusto"} description={isOver ? "Zmień status zadania." : "Brak zadań w tym statusie."}/>} 
    </div>
  </section>;
}

export function TaskBoard({ initialTasks, profiles, clients }: { initialTasks: TaskBoardTask[]; profiles: Option[]; clients: Option[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }));
  const selected = tasks.find(task=>task.id===selectedId) || null;
  const active = tasks.find(task=>task.id===activeId) || null;

  function optimisticStatus(task: TaskBoardTask, nextStatus: TaskBoardTask["status"]) {
    if (task.status === nextStatus) return;
    const previous = tasks;
    setTasks(current=>current.map(item=>item.id===task.id ? { ...item, status: nextStatus } : item));
    startTransition(async ()=>{
      try {
        await setTaskStatus(task.id, nextStatus);
        router.refresh();
      } catch {
        setTasks(previous);
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setActiveWidth(null);
    const taskId = String(event.active.id).replace("task:", "");
    const overId = event.over ? String(event.over.id) : "";
    if (!overId.startsWith("column:")) return;
    const nextStatus = overId.replace("column:", "") as TaskBoardTask["status"];
    const task = tasks.find(item=>item.id===taskId);
    if (task) optimisticStatus(task,nextStatus);
  }

  function saveTask(task: TaskBoardTask, formData: FormData) {
    const previous = tasks;
    const status = String(formData.get("status") || task.status) as TaskBoardTask["status"];
    const clientId = String(formData.get("client_id") || "") || null;
    const assignedTo = String(formData.get("assigned_to") || "") || null;
    const next: TaskBoardTask = {
      ...task,
      title: String(formData.get("title") || task.title),
      description: String(formData.get("description") || "") || null,
      status,
      priority: String(formData.get("priority") || task.priority) as TaskBoardTask["priority"],
      client_id: clientId,
      assigned_to: assignedTo,
      due_date: String(formData.get("due_date") || "") || null,
      due_time: String(formData.get("due_time") || "") || null,
      reminder_at: String(formData.get("reminder_at") || "") || null,
      clients: clientId ? { name: clients.find(item=>item.id===clientId)?.name || "" } : null,
      profiles: assignedTo ? { full_name: profiles.find(item=>item.id===assignedTo)?.full_name || null, email: profiles.find(item=>item.id===assignedTo)?.email || null } : null,
    };
    setTasks(current=>current.map(item=>item.id===task.id ? next : item));
    setSelectedId(null);
    startTransition(async ()=>{
      try {
        await updateTask(task.id, formData);
        router.refresh();
      } catch {
        setTasks(previous);
      }
    });
  }

  return <>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerFirstCollision}
      onDragStart={(event)=>{
        setActiveId(String(event.active.id).replace("task:",""));
        setActiveWidth(event.active.rect.current.initial?.width ?? null);
      }}
      onDragCancel={()=>{ setActiveId(null); setActiveWidth(null); }}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-5 xl:grid-cols-4">
        {columns.map(([status,label,Icon,tone])=><TaskColumn key={status} status={status} label={label} Icon={Icon} tone={tone} tasks={tasks.filter(task=>task.status===status)} onOpen={(task)=>setSelectedId(task.id)} onStatus={optimisticStatus}/>)}
      </div>
      <DragOverlay adjustScale={false} dropAnimation={{ duration: 150, easing: "cubic-bezier(.2,.8,.2,1)" }}>
        {active ? <div style={{ width: activeWidth ?? undefined }} className="rotate-[0.5deg] rounded-2xl border border-[#cfdcf0] bg-white p-4 shadow-[0_18px_45px_rgba(28,44,60,.18)]"><div className="font-semibold text-[#32414c]">{active.title}</div><div className="mt-2 text-xs text-[#84919c]">Upuść w wybranej kolumnie</div></div> : null}
      </DragOverlay>
    </DndContext>

    <Modal open={Boolean(selected)} onClose={()=>setSelectedId(null)} title={selected?.title || "Zadanie"} eyebrow="Zadanie">
      {selected && <form key={selected.id} onSubmit={(event)=>{event.preventDefault(); saveTask(selected,new FormData(event.currentTarget));}} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa</label><Input name="title" required defaultValue={selected.title}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Status</label><Select name="status" defaultValue={selected.status}><option value="todo">Do zrobienia</option><option value="in_progress">W trakcie</option><option value="waiting">Oczekuje</option><option value="done">Gotowe</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Priorytet</label><Select name="priority" defaultValue={selected.priority}><option value="low">Niski</option><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Termin</label><Input name="due_date" type="date" defaultValue={selected.due_date || ""}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Godzina</label><TimePicker name="due_time" defaultValue={selected.due_time} optional/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypisz</label><Select name="assigned_to" defaultValue={selected.assigned_to || ""}>{profiles.map(profile=><option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>)}</Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id" defaultValue={selected.client_id || ""}><option value="">— bez klienta —</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</Select></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypomnienie</label><DateTimePicker name="reminder_at" defaultValue={localDateTime(selected.reminder_at)}/></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" rows={5} defaultValue={selected.description || ""}/></div>
        <div className="md:col-span-2 flex justify-end gap-2 border-t border-[#edf1f5] pt-4"><Button type="button" variant="secondary" onClick={()=>setSelectedId(null)}>Anuluj</Button><Button type="submit">Zapisz zmiany</Button></div>
      </form>}
    </Modal>
  </>;
}
