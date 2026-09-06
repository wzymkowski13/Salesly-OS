import Link from "next/link";
import { createCustomer } from "@/lib/actions/clients";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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

  return <div className="space-y-7">
    <SectionHeader title="CRM" description="Klienci, produkty, kontakty i historia w jednym miejscu." />
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <form className="flex gap-2"><Input name="q" defaultValue={q} placeholder="Szukaj: firma, osoba, NIP, telefon, email…"/><Button variant="secondary">Szukaj</Button></form>
      <div className="flex gap-2"><Link className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" href="/crm">Wszyscy</Link><Link className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" href="/crm?status=active">Aktywni</Link><Link className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" href="/crm?status=prospect">Prospekci</Link></div>
    </div>

    <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 font-medium">+ Dodaj klienta <span className="float-right text-zinc-400 group-open:rotate-45">+</span></summary>
      <form action={createCustomer} className="grid gap-4 border-t border-zinc-100 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-medium text-zinc-500">Nazwa / imię i nazwisko</label><Input name="name" required/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Typ</label><Select name="kind"><option value="company">Firma</option><option value="person">Osoba</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Status</label><Select name="status"><option value="active">Aktywny klient</option><option value="prospect">Prospekt</option><option value="inactive">Nieaktywny</option></Select></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">NIP</label><Input name="nip"/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Telefon</label><Input name="phone"/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Email</label><Input name="email" type="email"/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Opiekun</label><Select name="owner_id">{(profiles || []).map((p:any)=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Miasto</label><Input name="city"/></div>
        <div><label className="mb-1.5 block text-xs font-medium text-zinc-500">Kod</label><Input name="postal_code"/></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-medium text-zinc-500">Adres</label><Input name="address"/></div>
        <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-medium text-zinc-500">Tagi</label><Input name="tags" placeholder="grupowe, majątek, VIP"/></div>
        <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-medium text-zinc-500">Notatka startowa</label><Textarea name="notes"/></div>
        <div className="md:col-span-2 xl:col-span-4"><Button type="submit">Utwórz klienta</Button></div>
      </form>
    </details>

    <div className="grid gap-3">
      {(clients || []).map((client:any)=><Link href={`/crm/${client.id}`} key={client.id}><Card className="transition hover:border-zinc-300 hover:shadow-md"><CardContent className="grid items-center gap-3 p-4 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
        <div className="min-w-0"><div className="truncate font-semibold">{client.name}</div><div className="mt-1 flex flex-wrap gap-1">{(client.tags || []).slice(0,4).map((tag:string)=><Badge key={tag}>{tag}</Badge>)}</div></div>
        <div className="text-sm text-zinc-500"><div>{client.kind === "company" ? "Firma" : "Osoba"}</div><div className="text-xs">{client.nip || "bez NIP"}</div></div>
        <div className="text-sm text-zinc-500"><div>{client.phone || "—"}</div><div className="truncate text-xs">{client.email || "—"}</div></div>
        <div className="text-sm text-zinc-500"><div>{client.city || "—"}</div><div className="truncate text-xs">{client.profiles?.full_name || client.profiles?.email || "bez opiekuna"}</div></div>
        <div className="flex flex-wrap justify-end gap-1">{Array.from(new Set((client.policies || []).map((p:any)=>p.category))).slice(0,4).map((cat:any)=><Badge key={cat} variant="blue">{cat}</Badge>)}</div>
      </CardContent></Card></Link>)}
      {!clients?.length && <EmptyState title="Brak klientów" description={q ? "Nie znaleziono pasujących rekordów." : "Dodaj pierwszy rekord CRM."}/>} 
    </div>
  </div>;
}
