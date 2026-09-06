import { Check, Clock3, PauseCircle, PlayCircle } from "lucide-react";
import { createTask, setTaskStatus } from "@/lib/actions/tasks";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

const columns = [
  ["todo", "Do zrobienia", Clock3],
  ["in_progress", "W trakcie", PlayCircle],
  ["waiting", "Oczekuje", PauseCircle],
  ["done", "Gotowe", Check],
] as const;

export default async function TasksPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: tasks }, { data: profiles }, { data: clients }] = await Promise.all([
    supabase.from("tasks").select("*, clients(name), profiles!tasks_assigned_to_fkey(full_name,email)").order("created_at", { ascending: false }).limit(300),
    supabase.from("profiles").select("id,full_name,email").eq("is_active", true).order("full_name"),
    supabase.from("clients").select("id,name").is("archived_at", null).order("name").limit(500),
  ]);

  return <div className="space-y-7">
    <SectionHeader title="Taski" description="Prosto: kto, co i na kiedy. Bez udawania Jiry." />
    <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 font-medium">+ Dodaj task <span className="float-right text-zinc-400 group-open:rotate-45">+</span></summary>
      <form action={createTask} className="grid gap-4 border-t border-zinc-100 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-medium text-zinc-500">Nazwa</label><Input name="title" required placeholder="Np. oddzwonić do ABC"/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Termin</label><Input name="due_date" type="date"/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Godzina</label><Input name="due_time" type="time"/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Przypisz</label><Select name="assigned_to">{(profiles || []).map((p:any)=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Priorytet</label><Select name="priority" defaultValue="normal"><option value="low">Niski</option><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Klient</label><Select name="client_id"><option value="">— bez klienta —</option>{(clients || []).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Przypomnienie</label><Input name="reminder_at" type="datetime-local"/></div>
        <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-medium text-zinc-500">Opis</label><Textarea name="description" placeholder="Opcjonalnie: kontekst, ustalenia, numer oferty…"/></div>
        <div className="md:col-span-2 xl:col-span-4"><Button type="submit">Dodaj task</Button></div>
      </form>
    </details>

    <div className="grid gap-5 xl:grid-cols-4">
      {columns.map(([status,label,Icon]) => {
        const list = (tasks || []).filter((t:any)=>t.status===status);
        return <Card key={status} className="min-w-0"><CardHeader><div className="flex items-center gap-2"><Icon size={17}/><h2 className="font-semibold">{label}</h2></div><Badge>{list.length}</Badge></CardHeader><CardContent className="space-y-3">
          {list.map((task:any)=><div key={task.id} className="rounded-xl border border-zinc-200 p-3.5">
            <div className="flex items-start justify-between gap-2"><div className="font-medium leading-5">{task.title}</div><Badge variant={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : task.priority === "low" ? "neutral" : "blue"}>{task.priority}</Badge></div>
            {task.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{task.description}</p>}
            <div className="mt-3 space-y-1 text-xs text-zinc-500"><div>{task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ` • ${task.due_time.slice(0,5)}` : ""}` : "Bez terminu"}</div>{task.clients?.name && <div>Klient: {task.clients.name}</div>}<div>Owner: {task.profiles?.full_name || task.profiles?.email || "—"}</div></div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {status !== "in_progress" && status !== "done" && <form action={setTaskStatus.bind(null, task.id, "in_progress")}><Button variant="secondary" size="sm">W trakcie</Button></form>}
              {status !== "waiting" && status !== "done" && <form action={setTaskStatus.bind(null, task.id, "waiting")}><Button variant="ghost" size="sm">Oczekuje</Button></form>}
              {status !== "done" && <form action={setTaskStatus.bind(null, task.id, "done")}><Button size="sm">✓ Gotowe</Button></form>}
              {status === "done" && <form action={setTaskStatus.bind(null, task.id, "todo")}><Button variant="secondary" size="sm">Przywróć</Button></form>}
            </div>
          </div>)}
          {!list.length && <EmptyState title="Pusto" description="Tu nic nie zalega."/>}
        </CardContent></Card>;
      })}
    </div>
  </div>;
}
