import { Check, Clock3, PauseCircle, PlayCircle } from "lucide-react";
import { createTask, setTaskStatus } from "@/lib/actions/tasks";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SectionHeader } from "@/components/section-header";
import { FormDisclosure } from "@/components/form-disclosure";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

const columns = [
  ["todo", "Do zrobienia", Clock3, "bg-[#eef3ff] text-[#4f78e7]"],
  ["in_progress", "W trakcie", PlayCircle, "bg-emerald-50 text-emerald-600"],
  ["waiting", "Oczekuje", PauseCircle, "bg-amber-50 text-amber-600"],
  ["done", "Gotowe", Check, "bg-[#f0f3f6] text-[#637480]"],
] as const;

function priorityLabel(priority: string) {
  return priority === "urgent" ? "Pilne" : priority === "high" ? "Wysokie" : priority === "low" ? "Niskie" : "Normalne";
}

export default async function TasksPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: tasks }, { data: profiles }, { data: clients }] = await Promise.all([
    supabase.from("tasks").select("*, clients(name), profiles!tasks_assigned_to_fkey(full_name,email)").order("created_at", { ascending: false }).limit(300),
    supabase.from("profiles").select("id,full_name,email").eq("is_active", true).order("full_name"),
    supabase.from("clients").select("id,name").is("archived_at", null).order("name").limit(500),
  ]);

  const newTaskForm = <form action={createTask} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa</label><Input name="title" required placeholder="Np. oddzwonić do ABC"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Termin</label><Input name="due_date" type="date"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Godzina</label><Input name="due_time" type="time"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypisz</label><Select name="assigned_to">{(profiles || []).map((p:any)=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Priorytet</label><Select name="priority" defaultValue="normal"><option value="low">Niski</option><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id"><option value="">— bez klienta —</option>{(clients || []).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypomnienie</label><Input name="reminder_at" type="datetime-local"/></div>
    <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" placeholder="Kontekst lub ustalenia"/></div>
    <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button type="submit">Dodaj zadanie</Button></div>
  </form>;

  return <div className="space-y-7">
    <SectionHeader title="Zadania" action={<FormDisclosure label="Dodaj zadanie" align="right">{newTaskForm}</FormDisclosure>} />

    <div className="grid gap-5 xl:grid-cols-4">
      {columns.map(([status,label,Icon,tone]) => {
        const list = (tasks || []).filter((t:any)=>t.status===status);
        return <Card key={status} className="min-w-0 bg-[#fbfcfe]">
          <CardHeader className="border-b-0 pb-2">
            <div className="flex items-center gap-2.5"><div className={`rounded-xl p-2 ${tone}`}><Icon size={16}/></div><h2 className="text-sm font-bold text-[#34434e]">{label}</h2></div>
            <Badge>{list.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {list.map((task:any)=><div key={task.id} className="rounded-2xl border border-[#e3e9f0] bg-white p-4 shadow-[0_2px_10px_rgba(34,49,60,.025)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(34,49,60,.07)]">
              <div className="flex items-start justify-between gap-2"><div className="font-semibold leading-5 text-[#32414c]">{task.title}</div><Badge variant={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : task.priority === "low" ? "neutral" : "blue"}>{priorityLabel(task.priority)}</Badge></div>
              {task.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#768590]">{task.description}</p>}
              <div className="mt-3 space-y-1 text-xs text-[#84919c]"><div>{task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ` · ${task.due_time.slice(0,5)}` : ""}` : "Bez terminu"}</div>{task.clients?.name && <div>{task.clients.name}</div>}<div>{task.profiles?.full_name || task.profiles?.email || "—"}</div></div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {status !== "in_progress" && status !== "done" && <form action={setTaskStatus.bind(null, task.id, "in_progress")}><Button variant="soft" size="sm">W trakcie</Button></form>}
                {status !== "waiting" && status !== "done" && <form action={setTaskStatus.bind(null, task.id, "waiting")}><Button variant="ghost" size="sm">Oczekuje</Button></form>}
                {status !== "done" && <form action={setTaskStatus.bind(null, task.id, "done")}><Button size="sm"><Check size={14}/> Gotowe</Button></form>}
                {status === "done" && <form action={setTaskStatus.bind(null, task.id, "todo")}><Button variant="secondary" size="sm">Przywróć</Button></form>}
              </div>
            </div>)}
            {!list.length && <EmptyState title="Pusto" description="Brak zadań w tym statusie."/>}
          </CardContent>
        </Card>;
      })}
    </div>
  </div>;
}
