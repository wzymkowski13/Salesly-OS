import Link from "next/link";
import { Building2, Search, UserRound } from "lucide-react";
import { createCustomer } from "@/lib/actions/clients";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SectionHeader } from "@/components/section-header";
import { FormDisclosure } from "@/components/form-disclosure";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const categoryLabel: Record<string,string> = {
  group_life: "Grupowe",
  individual_life: "Życie",
  property: "Majątek",
  open_group: "Grupa otwarta",
  other: "Inne",
};

const statusLabel: Record<string,string> = { active: "Aktywny", prospect: "Prospekt", inactive: "Nieaktywny" };

export default async function CRMPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const q = (params.q || "").trim();
  const supabase = await createClient();
  let query = supabase.from("clients").select("id,kind,status,name,nip,phone,email,city,tags,owner_id,profiles!clients_owner_id_fkey(full_name,email),policies(category)").is("archived_at", null).order("name").limit(500);
  if (q) query = query.or(`name.ilike.%${q}%,nip.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  if (params.status) query = query.eq("status", params.status);
  const [{ data: clients }, { data: profiles }] = await Promise.all([
    query,
    supabase.from("profiles").select("id,full_name,email").eq("is_active", true).order("full_name")
  ]);

  const addClientForm = <form action={createCustomer} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa / imię i nazwisko</label><Input name="name" required/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Typ</label><Select name="kind"><option value="company">Firma</option><option value="person">Osoba</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Status</label><Select name="status"><option value="active">Aktywny klient</option><option value="prospect">Prospekt</option><option value="inactive">Nieaktywny</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">NIP</label><Input name="nip"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Telefon</label><Input name="phone"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Email</label><Input name="email" type="email"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opiekun</label><Select name="owner_id">{(profiles || []).map((p:any)=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Miasto</label><Input name="city"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Kod</label><Input name="postal_code"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Adres</label><Input name="address"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Tagi</label><Input name="tags" placeholder="grupowe, majątek, VIP"/></div>
    <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatka</label><Textarea name="notes"/></div>
    <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button type="submit">Dodaj klienta</Button></div>
  </form>;

  return <div className="space-y-6">
    <SectionHeader title="CRM" action={<FormDisclosure label="Dodaj klienta" align="right">{addClientForm}</FormDisclosure>} />

    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <form className="relative flex w-full max-w-xl gap-2">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a4ae]"/>
        <Input className="pl-9" name="q" defaultValue={q} placeholder="Firma, osoba, NIP, telefon lub email"/>
        <Button variant="secondary">Szukaj</Button>
      </form>
      <div className="flex w-fit rounded-xl bg-[#eef2f6] p-1">
        {[
          ["", "Wszyscy"],
          ["active", "Aktywni"],
          ["prospect", "Prospekci"],
        ].map(([value,label]) => {
          const active = (params.status || "") === value;
          const href = value ? `/crm?status=${value}` : "/crm";
          return <Link key={value || "all"} href={href} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition", active ? "bg-white text-[#456edb] shadow-sm" : "text-[#71808b] hover:text-[#40515d]")}>{label}</Link>;
        })}
      </div>
    </div>

    {clients?.length ? <Card className="overflow-hidden">
      <div className="hidden grid-cols-[1.7fr_.7fr_1fr_1fr_1fr] gap-4 border-b border-[#e9eef3] bg-[#f8fafc] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b98a3] md:grid">
        <div>Klient</div><div>Status</div><div>Kontakt</div><div>Opiekun</div><div>Produkty</div>
      </div>
      <div className="divide-y divide-[#edf1f5]">
        {(clients || []).map((client:any)=>{
          const categories = Array.from(new Set((client.policies || []).map((p:any)=>p.category))) as string[];
          return <Link href={`/crm/${client.id}`} key={client.id} className="group grid gap-3 px-4 py-4 transition hover:bg-[#fbfcfe] md:grid-cols-[1.7fr_.7fr_1fr_1fr_1fr] md:items-center md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", client.kind === "company" ? "bg-[#eef3ff] text-[#4f78e7]" : "bg-emerald-50 text-emerald-600")}>{client.kind === "company" ? <Building2 size={18}/> : <UserRound size={18}/>}</div>
              <div className="min-w-0"><div className="truncate text-sm font-bold text-[#31414c] group-hover:text-[#456edb]">{client.name}</div><div className="mt-1 flex flex-wrap gap-1">{(client.tags || []).slice(0,3).map((tag:string)=><Badge key={tag}>{tag}</Badge>)}</div></div>
            </div>
            <div><Badge variant={client.status === "active" ? "green" : client.status === "prospect" ? "blue" : "neutral"}>{statusLabel[client.status] || client.status}</Badge></div>
            <div className="min-w-0 text-sm text-[#637480]"><div className="truncate">{client.phone || "—"}</div><div className="truncate text-xs text-[#929da6]">{client.email || client.nip || "—"}</div></div>
            <div className="min-w-0 text-sm text-[#637480]"><div className="truncate">{client.profiles?.full_name || client.profiles?.email || "—"}</div><div className="truncate text-xs text-[#929da6]">{client.city || "—"}</div></div>
            <div className="flex flex-wrap gap-1">{categories.slice(0,4).map((cat:string)=><Badge key={cat} variant="blue">{categoryLabel[cat] || cat}</Badge>)}{!categories.length && <span className="text-xs text-[#a0abb4]">brak polis</span>}</div>
          </Link>;
        })}
      </div>
    </Card> : <EmptyState title="Brak klientów" description={q ? "Nie znaleziono pasujących rekordów." : "Dodaj pierwszy rekord CRM."}/>} 
  </div>;
}
