import { createOpportunity, updateOpportunityStage } from "@/lib/actions/opportunities";
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

const stages = [
  ["new", "Nowy"],
  ["contact", "Kontakt"],
  ["meeting", "Spotkanie"],
  ["offer", "Oferta"],
  ["decision", "Decyzja"],
  ["won", "Wygrane"],
  ["lost", "Przegrane"],
] as const;

const categoryLabel: Record<string, string> = {
  group_life: "Grupowe",
  individual_life: "Życie",
  property: "Majątek",
  open_group: "Grupa otwarta",
  other: "Inne",
};

export default async function PipelinePage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: opportunities }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase.from("opportunities").select("id,title,category,stage,estimated_value,probability,next_step,expected_close_date,source,client_id,owner_id,clients(name),profiles!opportunities_owner_id_fkey(full_name,email)").order("created_at", { ascending: false }),
    supabase.from("clients").select("id,name").is("archived_at", null).order("name").limit(500),
    supabase.from("profiles").select("id,full_name,email").eq("is_active", true).order("full_name"),
  ]);

  const addForm = <form action={createOpportunity} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Nazwa szansy</label><Input name="title" required placeholder="np. Grupówka ABC Sp. z o.o."/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Klient</label><Select name="client_id" required><option value="">Wybierz klienta</option>{(clients || []).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Kategoria</label><Select name="category"><option value="group_life">Grupowe</option><option value="individual_life">Życie</option><option value="property">Majątek</option><option value="open_group">Grupa otwarta</option><option value="other">Inne</option></Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Etap</label><Select name="stage">{stages.slice(0,5).map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Wartość szacowana</label><Input name="estimated_value" inputMode="decimal" placeholder="0,00"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Prawdopodobieństwo %</label><Input name="probability" type="number" min={0} max={100}/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Planowane domknięcie</label><Input name="expected_close_date" type="date"/></div>
    <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Następny krok</label><Input name="next_step" placeholder="np. wysłać ofertę po spotkaniu"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Źródło</label><Input name="source" placeholder="np. VICIdial / polecenie"/></div>
    <div><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Opiekun</label><Select name="owner_id">{(profiles || []).map((p:any)=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</Select></div>
    <div className="md:col-span-2 xl:col-span-4"><label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Notatka</label><Textarea name="notes"/></div>
    <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button type="submit">Dodaj szansę</Button></div>
  </form>;

  const list = opportunities || [];
  const openValue = list.filter((o:any)=>!["won","lost"].includes(o.stage)).reduce((sum:number,o:any)=>sum + Number(o.estimated_value || 0),0);
  const weightedValue = list.filter((o:any)=>!["won","lost"].includes(o.stage)).reduce((sum:number,o:any)=>sum + Number(o.estimated_value || 0) * Number(o.probability || 0) / 100,0);

  return <div className="space-y-6">
    <SectionHeader title="Pipeline" action={<FormDisclosure label="Dodaj szansę" align="right">{addForm}</FormDisclosure>} />

    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b98a3]">Otwarte szanse</div><div className="mt-2 text-2xl font-bold text-[#31414c]">{list.filter((o:any)=>!["won","lost"].includes(o.stage)).length}</div></Card>
      <Card className="p-4"><div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b98a3]">Wartość pipeline</div><div className="mt-2 text-2xl font-bold text-[#31414c]">{openValue.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł</div></Card>
      <Card className="p-4"><div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b98a3]">Wartość ważona</div><div className="mt-2 text-2xl font-bold text-[#31414c]">{weightedValue.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł</div></Card>
    </div>

    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1500px] grid-cols-7 gap-3">
        {stages.map(([stage,label]) => {
          const items = list.filter((o:any)=>o.stage === stage);
          return <div key={stage} className="rounded-2xl border border-[#e1e7ee] bg-[#f8fafc] p-3">
            <div className="mb-3 flex items-center justify-between"><div className="text-sm font-bold text-[#40515d]">{label}</div><Badge>{items.length}</Badge></div>
            <div className="space-y-2">
              {items.map((o:any)=><Card key={o.id} className="p-3">
                <div className="text-sm font-bold text-[#31414c]">{o.title}</div>
                <div className="mt-1 text-xs text-[#7d8b96]">{o.clients?.name || "—"}</div>
                <div className="mt-2 flex flex-wrap gap-1"><Badge variant="blue">{categoryLabel[o.category] || o.category}</Badge>{o.probability != null && <Badge>{o.probability}%</Badge>}</div>
                {o.estimated_value != null && <div className="mt-2 text-sm font-semibold text-[#516673]">{Number(o.estimated_value).toLocaleString("pl-PL")} zł</div>}
                {o.next_step && <div className="mt-2 text-xs text-[#72818d]"><span className="font-semibold">Dalej:</span> {o.next_step}</div>}
                {o.expected_close_date && <div className="mt-1 text-xs text-[#9aa5ae]">Domknięcie: {new Date(o.expected_close_date).toLocaleDateString("pl-PL")}</div>}
                <form action={async (formData: FormData) => { "use server"; await updateOpportunityStage(o.id, String(formData.get("stage") || stage)); }} className="mt-3 flex gap-2">
                  <Select name="stage" defaultValue={stage} className="h-9 text-xs">{stages.map(([value,text])=><option key={value} value={value}>{text}</option>)}</Select>
                  <Button type="submit" variant="secondary" className="h-9 px-2 text-xs">Przenieś</Button>
                </form>
              </Card>)}
              {!items.length && <div className="rounded-xl border border-dashed border-[#dbe3eb] px-3 py-6 text-center text-xs text-[#98a4ae]">Brak szans</div>}
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}
