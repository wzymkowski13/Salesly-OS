import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarClock, Check, History, Mail, MapPin, Phone, ShieldCheck, UserRound, Users } from "lucide-react";
import { addActivity, addContact, addPolicy, archiveClient, updateCustomer } from "@/lib/actions/clients";
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
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const categoryLabel: Record<string,string> = {
  group_life: "Grupowe",
  individual_life: "Życie indywidualne",
  property: "Majątek",
  open_group: "Grupa otwarta",
  other: "Inne",
};
const statusLabel: Record<string,string> = { active: "Aktywny", prospect: "Prospekt", inactive: "Nieaktywny" };

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

  const editForm = <form action={updateCustomer.bind(null,id)} className="grid gap-3 md:grid-cols-2">
    <div className="md:col-span-2"><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Nazwa</label><Input name="name" defaultValue={client.name} required/></div>
    <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Typ</label><Select name="kind" defaultValue={client.kind}><option value="company">Firma</option><option value="person">Osoba</option></Select></div>
    <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Status</label><Select name="status" defaultValue={client.status}><option value="active">Aktywny</option><option value="prospect">Prospekt</option><option value="inactive">Nieaktywny</option></Select></div>
    <Input name="nip" defaultValue={client.nip || ""} placeholder="NIP"/><Input name="phone" defaultValue={client.phone || ""} placeholder="Telefon"/>
    <Input className="md:col-span-2" name="email" type="email" defaultValue={client.email || ""} placeholder="Email"/>
    <Input name="postal_code" defaultValue={client.postal_code || ""} placeholder="Kod"/><Input name="city" defaultValue={client.city || ""} placeholder="Miasto"/>
    <Input className="md:col-span-2" name="address" defaultValue={client.address || ""} placeholder="Adres"/>
    <Select className="md:col-span-2" name="owner_id" defaultValue={client.owner_id || user.id}>{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select>
    <Input className="md:col-span-2" name="tags" defaultValue={(client.tags || []).join(", ")} placeholder="Tagi"/>
    <Textarea className="md:col-span-2" name="notes" defaultValue={client.notes || ""} placeholder="Notatka"/>
    <div className="md:col-span-2 flex justify-end"><Button size="sm">Zapisz zmiany</Button></div>
  </form>;

  return <div className="space-y-6">
    <SectionHeader title={client.name} action={<Link href="/crm" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe6ee] bg-white px-3 text-sm font-semibold text-[#53636f] shadow-sm transition hover:bg-[#f8fafc]"><ArrowLeft size={16}/> CRM</Link>} />

    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={client.status === "active" ? "green" : client.status === "prospect" ? "blue" : "neutral"}>{statusLabel[client.status] || client.status}</Badge>
      <Badge variant="blue">{client.kind === "company" ? "Firma" : "Osoba"}</Badge>
      {(client.tags || []).map((tag:string)=><Badge key={tag}>{tag}</Badge>)}
      <span className="ml-1 text-xs text-[#87949f]">Opiekun: {client.profiles?.full_name || client.profiles?.email || "—"}</span>
    </div>

    <div className="grid gap-5 xl:grid-cols-[.95fr_1.65fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]">{client.kind === "company" ? <Building2 size={18}/> : <UserRound size={18}/>}</div><h2 className="font-bold text-[#30404b]">Dane klienta</h2></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f6f8] text-[#778691]"><Phone size={15}/></div><div><div className="text-[11px] font-bold uppercase tracking-wider text-[#9aa5ae]">Telefon</div><div className="mt-0.5 font-semibold text-[#43535f]">{client.phone || "—"}</div></div></div>
              <div className="flex items-start gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f6f8] text-[#778691]"><Mail size={15}/></div><div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-wider text-[#9aa5ae]">Email</div><div className="mt-0.5 break-all font-semibold text-[#43535f]">{client.email || "—"}</div></div></div>
              <div className="flex items-start gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f6f8] text-[#778691]"><MapPin size={15}/></div><div><div className="text-[11px] font-bold uppercase tracking-wider text-[#9aa5ae]">Adres</div><div className="mt-0.5 font-semibold text-[#43535f]">{[client.address, client.postal_code, client.city].filter(Boolean).join(", ") || "—"}</div></div></div>
              {client.kind === "company" && <div className="rounded-xl bg-[#f8fafc] px-3 py-2.5"><span className="text-xs font-semibold text-[#8a97a1]">NIP</span><span className="ml-3 text-sm font-bold text-[#43535f]">{client.nip || "—"}</span></div>}
            </div>
            {client.notes && <div className="rounded-xl border border-[#e8edf2] bg-[#fbfcfe] p-3 text-sm leading-6 text-[#637480]">{client.notes}</div>}
            <FormDisclosure label="Edytuj dane" compact variant="secondary" mode="inline">{editForm}</FormDisclosure>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><Users size={18}/></div><h2 className="font-bold text-[#30404b]">Kontakty</h2></div><Badge>{contacts.length}</Badge></CardHeader>
          <CardContent className="space-y-3">
            {contacts.map(contact=><div key={contact.id} className="rounded-xl border border-[#e7ecf1] bg-[#fbfcfe] p-3.5"><div className="flex items-center gap-2 text-sm font-bold text-[#3a4a55]">{contact.full_name}{contact.is_primary && <Badge variant="green">Główny</Badge>}</div><div className="mt-1.5 text-xs text-[#7f8d98]">{[contact.role,contact.phone,contact.email].filter(Boolean).join(" · ")}</div></div>)}
            {!contacts.length && <EmptyState title="Brak kontaktów" description="Nie dodano jeszcze osoby kontaktowej."/>}
            <FormDisclosure label="Dodaj kontakt" compact variant="secondary" mode="inline"><form action={addContact.bind(null,id)} className="grid gap-3"><Input name="full_name" required placeholder="Imię i nazwisko"/><Input name="role" placeholder="Rola / stanowisko"/><div className="grid gap-3 sm:grid-cols-2"><Input name="phone" placeholder="Telefon"/><Input name="email" type="email" placeholder="Email"/></div><label className="flex items-center gap-2 text-sm text-[#586873]"><input type="checkbox" name="is_primary"/> Główny kontakt</label><div className="flex justify-end"><Button size="sm">Dodaj kontakt</Button></div></form></FormDisclosure>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><CalendarClock size={18}/></div><h2 className="font-bold text-[#30404b]">Następne działania</h2></div><Badge>{nextTasks.length}</Badge></CardHeader>
          <CardContent className="space-y-3">
            {nextTasks.map(task=><div key={task.id} className="rounded-xl border border-[#e7ecf1] bg-white p-3.5"><div className="text-sm font-bold text-[#3a4a55]">{task.title}</div><div className="mt-1 text-xs text-[#81909b]">{task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ` · ${task.due_time.slice(0,5)}` : ""}` : "bez terminu"} · {task.profiles?.full_name || task.profiles?.email || "—"}</div><div className="mt-3"><form action={setTaskStatus.bind(null,task.id,"done")}><Button size="sm"><Check size={14}/> Zamknij</Button></form></div></div>)}
            {!nextTasks.length && <EmptyState title="Brak działań" description="Nie ma otwartych follow-upów dla tego klienta."/>}
            <FormDisclosure label="Dodaj follow-up" compact variant="secondary" mode="inline"><form action={createTask} className="grid gap-3"><input type="hidden" name="client_id" value={id}/><Input name="title" required placeholder="Np. wrócić do opieki medycznej"/><div className="grid gap-3 sm:grid-cols-2"><Input name="due_date" type="date"/><Input name="due_time" type="time"/></div><Select name="assigned_to" defaultValue={user.id}>{profiles.map(p=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select><Select name="priority" defaultValue="normal"><option value="normal">Normalny</option><option value="high">Wysoki</option><option value="urgent">Pilny</option><option value="low">Niski</option></Select><div className="flex justify-end"><Button size="sm">Dodaj follow-up</Button></div></form></FormDisclosure>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><ShieldCheck size={18}/></div><h2 className="font-bold text-[#30404b]">Produkty i polisy</h2></div><Badge>{policies.length}</Badge></CardHeader>
          <CardContent className="space-y-3">
            {policies.map(policy=><div key={policy.id} className="grid gap-3 rounded-2xl border border-[#e4eaf0] bg-[#fbfcfe] p-4 md:grid-cols-[1.4fr_.8fr_.8fr_auto] md:items-center"><div><div className="font-bold text-[#354550]">{policy.product_name || categoryLabel[policy.category] || policy.category}</div><div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#7f8d98]"><Badge variant="blue">{categoryLabel[policy.category] || policy.category}</Badge><span>{policy.insurer}{policy.policy_number ? ` · ${policy.policy_number}` : ""}</span></div></div><div className="text-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-[#9aa5ae]">Start</div><div className="mt-1 font-semibold text-[#53636f]">{formatDate(policy.start_date)}</div></div><div className="text-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-[#9aa5ae]">Odnowienie</div><div className="mt-1 font-semibold text-[#53636f]">{formatDate(policy.renewal_date)}</div></div><div className="text-left text-sm font-bold text-[#354550] md:text-right">{formatCurrency(policy.premium)}</div></div>)}
            {!policies.length && <EmptyState title="Brak polis" description="Dodaj pierwszy produkt klienta."/>}
            <FormDisclosure label="Dodaj polisę" compact variant="secondary" mode="inline"><form action={addPolicy.bind(null,id)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Kategoria</label><Select name="category"><option value="group_life">Grupowe</option><option value="individual_life">Życie indywidualne</option><option value="property">Majątek</option><option value="open_group">Grupa otwarta</option><option value="other">Inne</option></Select></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">TU</label><Input name="insurer" defaultValue="PZU"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Nazwa produktu</label><Input name="product_name"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Nr polisy</label><Input name="policy_number"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Składka</label><Input name="premium" inputMode="decimal"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Liczba osób</label><Input name="member_count" type="number" min="0"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Start</label><Input name="start_date" type="date"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Koniec</label><Input name="end_date" type="date"/></div>
              <div><label className="mb-1 block text-xs font-semibold text-[#6f7d89]">Odnowienie</label><Input name="renewal_date" type="date"/></div>
              <label className="flex items-center gap-2 text-sm text-[#586873] md:col-span-2 xl:col-span-3"><input type="checkbox" name="annual_review" defaultChecked/> Przypominaj o rocznicy</label>
              <div className="md:col-span-2 xl:col-span-3"><Textarea name="notes" placeholder="Notatka do polisy"/></div>
              <div className="flex justify-end md:col-span-2 xl:col-span-3"><Button size="sm">Dodaj polisę</Button></div>
            </form></FormDisclosure>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#f0f3f6] p-2 text-[#667682]"><History size={18}/></div><h2 className="font-bold text-[#30404b]">Historia klienta</h2></div></CardHeader>
          <CardContent className="space-y-4">
            <FormDisclosure label="Dodaj wpis" compact variant="secondary" mode="inline"><form action={addActivity.bind(null,id)} className="grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><Select name="activity_type"><option value="note">Notatka</option><option value="call">Telefon</option><option value="meeting">Spotkanie</option><option value="email">Email</option></Select><Input name="title" required placeholder="Tytuł"/></div><Textarea name="content" placeholder="Co ustaliliśmy?"/><div className="flex justify-end"><Button size="sm">Zapisz wpis</Button></div></form></FormDisclosure>
            <div className="space-y-0">
              {activities.map((activity,index)=><div key={activity.id} className="relative pl-7 pb-5 last:pb-0"><div className="absolute left-[7px] top-3 h-[calc(100%-4px)] w-px bg-[#e3e9ef] last:hidden"/><div className="absolute left-0 top-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-[#eef3ff] ring-4 ring-white"><div className="h-1.5 w-1.5 rounded-full bg-[#4f78e7]"/></div><div className="text-sm font-bold text-[#3a4a55]">{activity.title}</div><div className="mt-0.5 text-xs text-[#929da6]">{formatDateTime(activity.occurred_at)} · {activity.profiles?.full_name || activity.profiles?.email || "system"}</div>{activity.content && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#677681]">{activity.content}</p>}</div>)}
            </div>
            {!activities.length && <EmptyState title="Brak historii" description="Nie ma jeszcze wpisów na osi czasu."/>}
          </CardContent>
        </Card>
      </div>
    </div>

    <Card className="border-red-100 bg-red-50/30"><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-bold text-[#4a555e]">Archiwizacja klienta</div><div className="mt-0.5 text-xs text-[#89959e]">Rekord pozostanie w bazie, ale zniknie z aktywnego CRM.</div></div><form action={archiveClient.bind(null,id)}><Button variant="danger" size="sm">Archiwizuj</Button></form></CardContent></Card>
  </div>;
}
