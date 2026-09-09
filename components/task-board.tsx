"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
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
import { Check, Clock3, GripVertical, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { deleteTask, setTaskStatus, updateTask } from "@/lib/actions/tasks";
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

type ActiveRect = { width: number; height: number } | null;

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
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function TaskCardContent({
  task,
  onStatus,
  overlay = false,
}: {
  task: TaskBoardTask;
  onStatus?: (status: TaskBoardTask["status"]) => void;
  overlay?: boolean;
}) {
  return <>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 font-semibold leading-5 text-[#32414c]">{task.title}</div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : task.priority === "low" ? "neutral" : "blue"}>{priorityLabel(task.priority)}</Badge>
        <span aria-hidden="true" className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[#9ba9b4]", overlay ? "opacity-70" : "opacity-55 transition group-hover:bg-[#f1f5f8] group-hover:text-[#5e7180] group-hover:opacity-100")}><GripVertical size={15}/></span>
      </div>
    </div>
    {task.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#768590]">{task.description}</p>}
    <div className="mt-3 space-y-1 text-xs text-[#84919c]">
      <div>{task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ` · ${task.due_time.slice(0,5)}` : ""}` : "Bez terminu"}</div>
      {task.clients?.name && <div>{task.clients.name}</div>}
      <div>{task.profiles?.full_name || task.profiles?.email || "—"}</div>
    </div>
    <div className={cn("mt-4 flex flex-wrap gap-1.5", overlay && "pointer-events-none")} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      {task.status !== "in_progress" && task.status !== "done" && <Button variant="soft" size="sm" type="button" onClick={() => onStatus?.("in_progress")}>W trakcie</Button>}
      {task.status !== "waiting" && task.status !== "done" && <Button variant="ghost" size="sm" type="button" onClick={() => onStatus?.("waiting")}>Oczekuje</Button>}
      {task.status !== "done" && <Button size="sm" type="button" onClick={() => onStatus?.("done")}><Check size={14}/> Gotowe</Button>}
      {task.status === "done" && <Button variant="secondary" size="sm" type="button" onClick={() => onStatus?.("todo")}>Przywróć</Button>}
    </div>
  </>;
}

function DraggableTaskCard({ task, onOpen, onStatus }: { task: TaskBoardTask; onOpen: () => void; onStatus: (status: TaskBoardTask["status"]) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task:${task.id}`, data: { taskId: task.id } });
  return <div
    ref={setNodeRef}
    onClick={onOpen}
    {...listeners}
    {...attributes}
    className={cn(
      "salesly-task-card group cursor-grab touch-none select-none rounded-2xl border border-[#e3e9f0] bg-white p-4 shadow-[0_2px_10px_rgba(34,49,60,.025)] transition-[border-color,box-shadow,opacity] duration-150 hover:border-[#d6e1ec] hover:shadow-[0_10px_28px_rgba(34,49,60,.08)] active:cursor-grabbing",
      isDragging && "opacity-20"
    )}
  >
    <TaskCardContent task={task} onStatus={onStatus}/>
  </div>;
}

function TaskColumn({ status, label, Icon, tone, tasks, onOpen, onStatus }: { status: TaskBoardTask["status"]; label: string; Icon: typeof Clock3; tone: string; tasks: TaskBoardTask[]; onOpen: (task: TaskBoardTask)=>void; onStatus: (task: TaskBoardTask,status:TaskBoardTask["status"])=>void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  return <section ref={setNodeRef} className={cn("min-w-0 rounded-[20px] border border-[#dfe6ee] bg-[#fbfcfe] shadow-[0_1px_2px_rgba(28,44,60,.025)] transition-all duration-200", isOver && "border-[#afc8f7] bg-[#f4f8ff] ring-4 ring-[#568deb]/5")}>
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
      <div className="flex items-center gap-2.5"><div className={`rounded-xl p-2 ${tone}`}><Icon size={16}/></div><h2 className="text-sm font-bold text-[#34434e]">{label}</h2></div><Badge>{tasks.length}</Badge>
    </div>
    <div className="min-h-[160px] space-y-3 p-4 pt-2">
      {tasks.map(task => <DraggableTaskCard key={task.id} task={task} onOpen={() => onOpen(task)} onStatus={next => onStatus(task,next)}/>)}
      {!tasks.length && <EmptyState title={isOver ? "Upuść tutaj" : "Pusto"} description={isOver ? "Zmień status zadania." : "Brak zadań w tym statusie."}/>} 
    </div>
  </section>;
}

export function TaskBoard({ initialTasks, profiles, clients }: { initialTasks: TaskBoardTask[]; profiles: Option[]; clients: Option[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRect, setActiveRect] = useState<ActiveRect>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  // Server Action + revalidatePath zmienia props bez pełnego reloadu strony.
  // Wcześniej lokalny useState ignorował nowe propsy, stąd zadanie pojawiało się dopiero po F5.
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const onOptimisticCreate = (event: Event) => {
      const detail = (event as CustomEvent<{ optimisticId: string; values: Record<string, FormDataEntryValue> }>).detail;
      const values = detail?.values;
      if (!values) return;

      const title = String(values.title || "").trim();
      if (!title) return;
      const assignedTo = String(values.assigned_to || "") || null;
      const clientId = String(values.client_id || "") || null;
      const task: TaskBoardTask = {
        id: detail.optimisticId,
        title,
        description: String(values.description || "").trim() || null,
        status: "todo",
        priority: (String(values.priority || "normal") as TaskBoardTask["priority"]),
        assigned_to: assignedTo,
        client_id: clientId,
        due_date: String(values.due_date || "") || null,
        due_time: String(values.due_time || "") || null,
        reminder_at: String(values.reminder_at || "") || null,
        clients: clientId ? { name: clients.find(item => item.id === clientId)?.name || "" } : null,
        profiles: assignedTo ? {
          full_name: profiles.find(item => item.id === assignedTo)?.full_name || null,
          email: profiles.find(item => item.id === assignedTo)?.email || null,
        } : null,
      };

      setTasks(current => current.some(item => item.id === task.id) ? current : [task, ...current]);
    };

    window.addEventListener("salesly:task-optimistic-create", onOptimisticCreate);
    return () => window.removeEventListener("salesly:task-optimistic-create", onOptimisticCreate);
  }, [clients, profiles]);

  const selected = tasks.find(task => task.id === selectedId) || null;
  const active = tasks.find(task => task.id === activeId) || null;

  function optimisticStatus(task: TaskBoardTask, nextStatus: TaskBoardTask["status"]) {
    if (task.status === nextStatus) return;
    const previous = tasks;
    setTasks(current => current.map(item => item.id === task.id ? { ...item, status: nextStatus } : item));
    startTransition(async () => {
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
    setActiveRect(null);
    const taskId = String(event.active.id).replace("task:", "");
    const overId = event.over ? String(event.over.id) : "";
    if (!overId.startsWith("column:")) return;
    const nextStatus = overId.replace("column:", "") as TaskBoardTask["status"];
    const task = tasks.find(item => item.id === taskId);
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
      clients: clientId ? { name: clients.find(item => item.id === clientId)?.name || "" } : null,
      profiles: assignedTo ? {
        full_name: profiles.find(item => item.id === assignedTo)?.full_name || null,
        email: profiles.find(item => item.id === assignedTo)?.email || null,
      } : null,
    };
    setTasks(current => current.map(item => item.id === task.id ? next : item));
    setSelectedId(null);
    startTransition(async () => {
      try {
        await updateTask(task.id, formData);
        router.refresh();
      } catch {
        setTasks(previous);
      }
    });
  }


  function removeTask(task: TaskBoardTask) {
    if (!window.confirm(`Usunąć zadanie „${task.title}”?`)) return;
    const previous = tasks;
    setTasks(current => current.filter(item => item.id !== task.id));
    setSelectedId(null);
    startTransition(async () => {
      try {
        await deleteTask(task.id);
        router.refresh();
      } catch {
        setTasks(previous);
        window.alert("Nie udało się usunąć zadania.");
      }
    });
  }

  const overlay = typeof document !== "undefined" ? createPortal(
    <DragOverlay
      adjustScale={false}
      zIndex={9999}
      dropAnimation={{ duration: 140, easing: "cubic-bezier(.2,.8,.2,1)" }}
    >
      {active ? <div
        style={{ width: activeRect?.width, height: activeRect?.height }}
        className="overflow-hidden rounded-2xl border border-[#cfdcf0] bg-white p-4 shadow-[0_18px_45px_rgba(28,44,60,.18)]"
      >
        <TaskCardContent task={active} overlay/>
      </div> : null}
    </DragOverlay>,
    document.body
  ) : null;

  return <>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerFirstCollision}
      onDragStart={(event) => {
        setActiveId(String(event.active.id).replace("task:",""));
        const rect = event.active.rect.current.initial;
        setActiveRect(rect ? { width: rect.width, height: rect.height } : null);
      }}
      onDragCancel={() => { setActiveId(null); setActiveRect(null); }}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-5 xl:grid-cols-4">
        {columns.map(([status,label,Icon,tone]) => <TaskColumn
          key={status}
          status={status}
          label={label}
          Icon={Icon}
          tone={tone}
          tasks={tasks.filter(task => task.status === status)}
          onOpen={task => setSelectedId(task.id)}
          onStatus={optimisticStatus}
        />)}
      </div>
      {overlay}
    </DndContext>

    <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.title || "Zadanie"} eyebrow="Zadanie">
      {selected && <form key={selected.id} onSubmit={event => { event.preventDefault(); saveTask(selected,new FormData(event.currentTarget)); }} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa</label><Input name="title" required defaultValue={selected.title}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Status</label><Select name="status" defaultValue={selected.status}><option value="todo">Do zrobienia</option><option value="in_progress">W trakcie</option><option value="waiting">Oczekuje</option><option value="done">Gotowe</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Priorytet</label><Select name="priority" defaultValue={selected.priority}><option value="low">Niski</option><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Termin</label><Input name="due_date" type="date" defaultValue={selected.due_date || ""}/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Godzina</label><TimePicker name="due_time" defaultValue={selected.due_time} optional/></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypisz</label><Select name="assigned_to" defaultValue={selected.assigned_to || ""}>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>)}</Select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id" defaultValue={selected.client_id || ""}><option value="">— bez klienta —</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</Select></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypomnienie</label><DateTimePicker name="reminder_at" defaultValue={localDateTime(selected.reminder_at)}/></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" rows={5} defaultValue={selected.description || ""}/></div>
        <div className="md:col-span-2 flex items-center justify-between gap-3 border-t border-[#edf1f5] pt-4">
          <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeTask(selected)}><Trash2 size={15}/> Usuń</Button>
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>Anuluj</Button><Button type="submit">Zapisz zmiany</Button></div>
        </div>
      </form>}
    </Modal>
  </>;
}
