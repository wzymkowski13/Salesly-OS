import { notFound } from "next/navigation";
import Link from "next/link";
import { addActivity, addContact, addPolicy, archiveClient, updateCustomer } from "@/lib/actions/clients";
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
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const categoryLabel: Record<string,string> = {
  group_life: "Grupowe",
  individual_life: "Życie indywidualne",
  property: "Majątek",
  open_group: "Grupa otwarta",
  other: "Inne",
};

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const [clientRes, contactsRes, policiesRes, activitiesRes, tasksRes, profilesRes] = await Promise.all([
    supabase.from("clients").select("*, profiles!clients_owner_id_fkey(full_name,email)").eq("id", id).is("archived_at", null).single(),
    supabase.from("contacts").select("*").eq("client_id", id).order("is_primary", { ascending: false }).order("full_name"),
    supabase.from("policies").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("activities").select("*, profiles!activities_created_by_fkey(full_name,email)").eq("client_id", id).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("tasks").select("*, profiles!tasks_assigned_to_fkey(full_name,email)").eq("client_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id,full_name,email").eq("is_active", true).order("full_name"),
  ]);
  if (clientRes.error || !clientRes.data) notFound();
  const client:any = clientRes.data;
  const contacts:any[] = contactsRes.data || [];
  const policies:any[] = policiesRes.data || [];
  const activities:any[] = activitiesRes.data || [];
  const tasks:any[] = tasksRes.data || [];
  const profiles:any[] = profilesRes.data || [];
  const nextTasks = tasks.filter(t=>t.status !== "done").slice(0,5);

  return <div className="space-y-7">
    <SectionHeader title={client.name} description={`${client.kind === "company" ? "Firma" : "Osoba"} • opiekun: ${client.profiles?.full_name || client.profiles?.email || "—"}`} action={<Link href="/crm" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">← CRM</Link>} />

    <div className="flex flex-wrap gap-2">{(client.tags || []).map((tag:string)=><Badge key={tag}>{tag}</Badge>)}<Badge variant={client.status === "active" ? "green" : client.status === "prospect" ? "blue" : "neutral"}>{client.status}</Badge></div>

    <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
      <div className="space-y-6">
        <Card><CardHeader><h2 className="font-semibold">Dane klienta</h2></CardHeader><CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-zinc-400">NIP</span><span>{client.nip || "—"}</span></div>
          <div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-zinc-400">Telefon</span><span>{client.phone || "—"}</span></div>
          <div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-zinc-400">Email</span><span>{client.email || "—"}</span></div>
          <div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-zinc-400">Adres</span><span>{[client.address, client.postal_code, client.city].filter(Boolean).join(", ") || "—"}</span></div>
          {client.notes && <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-zinc-600">{client.notes}</div>}
          <details className="mt-4 border-t border-zinc-100 pt-4"><summary className="cursor-pointer font-medium">Edytuj dane</summary><form action={updateCustomer.bind(null,id)} className="mt-3 grid gap-3">
            <Input name="name" defaultValue={client.name} required/>
            <div className="grid gap-3 sm:grid-cols-2"><Select name="kind" defaultValue={client.kind}><option value="company">Firma</option><option value="person">Osoba</option></Select><Select name="status" defaultValue={client.status}><option value="active">Aktywny</option><option value="prospect">Prospekt</option><option value="inactive">Nieaktywny</option></Select></div>
            <div className="grid gap-3 sm:grid-cols-2"><Input name="nip" defaultValue={client.nip || ""} placeholder="NIP"/><Input name="phone" defaultValue={client.phone || ""} placeholder="Telefon"/></div>
            <Input name="email" type="email" defaultValue={client.email || ""} placeholder="Email"/>
            <div className="grid gap-3 sm:grid-cols-2"><Input name="postal_code" defaultValue={client.postal_code || ""} placeholder="Kod"/><Input name="city" defaultValue={client.city || ""} placeholder="Miasto"/></div>
            <Input name="address" defaultValue={client.address || ""} placeholder="Adres"/>
            <Select name="owner_id" defaultValue={client.owner_id || user.id}>{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select>
            <Input name="tags" defaultValue={(client.tags || []).join(", ")} placeholder="Tagi"/>
            <Textarea name="notes" defaultValue={client.notes || ""} placeholder="Notatka"/>
            <Button size="sm">Zapisz zmiany</Button>
          </form></details>
        </CardContent></Card>

        <Card><CardHeader><h2 className="font-semibold">Kontakty</h2></CardHeader><CardContent className="space-y-3">
          {contacts.map(contact=><div key={contact.id} className="rounded-xl border border-zinc-100 p-3"><div className="flex items-center gap-2 font-medium">{contact.full_name}{contact.is_primary && <Badge variant="green">główny</Badge>}</div><div className="mt-1 text-xs text-zinc-500">{[contact.role,contact.phone,contact.email].filter(Boolean).join(" • ")}</div></div>)}
          {!contacts.length && <EmptyState title="Brak osób kontaktowych" description="Dodaj osobę decyzyjną lub główny kontakt."/>}
          <details><summary className="cursor-pointer text-sm font-medium">+ Dodaj kontakt</summary><form action={addContact.bind(null,id)} className="mt-3 grid gap-3"><Input name="full_name" required placeholder="Imię i nazwisko"/><Input name="role" placeholder="Rola / stanowisko"/><div className="grid gap-3 sm:grid-cols-2"><Input name="phone" placeholder="Telefon"/><Input name="email" type="email" placeholder="Email"/></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary"/> Główny kontakt</label><Button size="sm">Dodaj</Button></form></details>
        </CardContent></Card>

        <Card><CardHeader><h2 className="font-semibold">Następne działania</h2></CardHeader><CardContent className="space-y-3">
          {nextTasks.map(task=><div key={task.id} className="rounded-xl border border-zinc-100 p-3"><div className="font-medium">{task.title}</div><div className="mt-1 text-xs text-zinc-500">{task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ` • ${task.due_time.slice(0,5)}` : ""}` : "bez terminu"} • {task.profiles?.full_name || task.profiles?.email || "—"}</div><div className="mt-2"><form action={setTaskStatus.bind(null,task.id,"done")}><Button size="sm">✓ Zamknij</Button></form></div></div>)}
          {!nextTasks.length && <EmptyState title="Brak follow-upów" description="Dodaj następny krok, żeby klient nie zniknął z radaru."/>}
          <details><summary className="cursor-pointer text-sm font-medium">+ Dodaj follow-up</summary><form action={createTask} className="mt-3 grid gap-3"><input type="hidden" name="client_id" value={id}/><Input name="title" required placeholder="Np. wrócić do opieki medycznej"/><div className="grid gap-3 sm:grid-cols-2"><Input name="due_date" type="date"/><Input name="due_time" type="time"/></div><Select name="assigned_to" defaultValue={user.id}>{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select><Select name="priority" defaultValue="normal"><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option><option value="low">Niski</option></Select><Button size="sm">Dodaj</Button></form></details>
        </CardContent></Card>
      </div>

      <div className="space-y-6">
        <Card><CardHeader><div><h2 className="font-semibold">Produkty / polisy</h2><p className="text-xs text-zinc-500">Odnowienia i rocznice wynikają z tych danych.</p></div></CardHeader><CardContent className="space-y-3">
          {policies.map(policy=><div key={policy.id} className="grid gap-3 rounded-xl border border-zinc-100 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto]"><div><div className="font-medium">{policy.product_name || categoryLabel[policy.category] || policy.category}</div><div className="text-xs text-zinc-500">{policy.insurer}{policy.policy_number ? ` • ${policy.policy_number}` : ""}</div></div><div className="text-sm"><div className="text-xs text-zinc-400">Start</div>{formatDate(policy.start_date)}</div><div className="text-sm"><div className="text-xs text-zinc-400">Odnowienie</div>{formatDate(policy.renewal_date)}</div><div className="text-right text-sm font-medium">{formatCurrency(policy.premium)}</div></div>)}
          {!policies.length && <EmptyState title="Brak produktów" description="Dodaj polisę, aby uruchomić odnowienia i rocznice."/>}
          <details><summary className="cursor-pointer text-sm font-medium">+ Dodaj produkt / polisę</summary><form action={addPolicy.bind(null,id)} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div><label className="mb-1 block text-xs text-zinc-500">Kategoria</label><Select name="category"><option value="group_life">Grupowe</option><option value="individual_life">Życie indywidualne</option><option value="property">Majątek</option><option value="open_group">Grupa otwarta</option><option value="other">Inne</option></Select></div>
            <div><label className="mb-1 block text-xs text-zinc-500">TU</label><Input name="insurer" defaultValue="PZU"/></div>
            <div><label className="mb-1 block text-xs text-zinc-500">Nazwa produktu</label><Input name="product_name"/></div>
            <div><label className="mb-1 block text-xs text-zinc-500">Nr polisy</label><Input name="policy_number"/></div>
            <div><label className="mb-1 block text-xs text-zinc-500">Składka</label><Input name="premium" inputMode="decimal"/></div>
            <div><label className="mb-1 block text-xs text-zinc-500">Liczba osób</label><Input name="member_count" type="number" min="0"/></div>
            <div><label className="mb-1 block text-xs text-zinc-500">Start</label><Input name="start_date" type="date"/></div>
            <div><label className="mb-1 block text-xs text-zinc-500">Koniec</label><Input name="end_date" type="date"/></div>
            <div><label className="mb-1 block text-xs text-zinc-500">Odnowienie</label><Input name="renewal_date" type="date"/></div>
            <label className="flex items-center gap-2 text-sm md:col-span-2 xl:col-span-3"><input type="checkbox" name="annual_review" defaultChecked/> Przypominaj o rocznicy / annual review</label>
            <div className="md:col-span-2 xl:col-span-3"><Textarea name="notes" placeholder="Notatka do polisy"/></div>
            <div className="md:col-span-2 xl:col-span-3"><Button size="sm">Dodaj polisę</Button></div>
          </form></details>
        </CardContent></Card>

        <Card><CardHeader><div><h2 className="font-semibold">Historia klienta</h2><p className="text-xs text-zinc-500">Telefon, spotkanie, notatka, system.</p></div></CardHeader><CardContent className="space-y-3">
          <details className="rounded-xl border border-zinc-100 p-3"><summary className="cursor-pointer text-sm font-medium">+ Dodaj wpis</summary><form action={addActivity.bind(null,id)} className="mt-3 grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><Select name="activity_type"><option value="note">Notatka</option><option value="call">Telefon</option><option value="meeting">Spotkanie</option><option value="email">Email</option></Select><Input name="title" required placeholder="Tytuł"/></div><Textarea name="content" placeholder="Co ustaliliśmy?"/><Button size="sm">Zapisz</Button></form></details>
          {activities.map(activity=><div key={activity.id} className="relative border-l border-zinc-200 pl-5"><div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-zinc-400"/><div className="text-sm font-medium">{activity.title}</div><div className="mt-0.5 text-xs text-zinc-400">{formatDateTime(activity.occurred_at)} • {activity.profiles?.full_name || activity.profiles?.email || "system"}</div>{activity.content && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{activity.content}</p>}</div>)}
          {!activities.length && <EmptyState title="Historia jest pusta" description="Pierwszy wpis pojawi się po dodaniu notatki lub polisy."/>}
        </CardContent></Card>
      </div>
    </div>

    <Card className="border-red-100"><CardContent className="flex items-center justify-between gap-4"><div><div className="font-medium">Archiwizacja</div><div className="text-xs text-zinc-500">Rekord znika z aktywnego CRM, ale nie jest kasowany.</div></div><form action={archiveClient.bind(null,id)}><Button variant="danger" size="sm">Archiwizuj klienta</Button></form></CardContent></Card>
  </div>;
}
