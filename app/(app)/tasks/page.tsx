import { createTask } from "@/lib/actions/tasks";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SectionHeader } from "@/components/section-header";
import { FormDisclosure } from "@/components/form-disclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { TaskBoard, type TaskBoardTask } from "@/components/task-board";

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
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Godzina</label><TimePicker name="due_time" optional/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypisz</label><Select name="assigned_to">{(profiles || []).map((p:any)=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Priorytet</label><Select name="priority" defaultValue="normal"><option value="low">Niski</option><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id"><option value="">— bez klienta —</option>{(clients || []).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Przypomnienie</label><DateTimePicker name="reminder_at"/></div>
    <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opis</label><Textarea name="description" placeholder="Kontekst lub ustalenia"/></div>
    <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button type="submit">Dodaj zadanie</Button></div>
  </form>;

  return <div className="space-y-7">
    <SectionHeader title="Zadania" action={<FormDisclosure label="Dodaj zadanie" align="right">{newTaskForm}</FormDisclosure>} />
    <TaskBoard initialTasks={(tasks || []) as TaskBoardTask[]} profiles={(profiles || []) as any[]} clients={(clients || []) as any[]}/>
  </div>;
}
