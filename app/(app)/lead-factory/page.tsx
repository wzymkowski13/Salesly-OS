import Link from "next/link";
import { ArrowRight, Building2, Database, Factory, UserRound } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LeadFactoryWorkspace } from "@/components/lead-factory-workspace";

const modules = [
  {
    title: "Firmy 10+",
    description: "Kampanie pozyskiwania firm, historia runów i paczki do dzwonienia.",
    icon: Building2,
    status: "UI gotowe",
  },
  {
    title: "JDG",
    description: "Pozyskiwanie przedsiębiorców i obsługa kampanii CEIDG.",
    icon: UserRound,
    status: "UI gotowe",
  },
  {
    title: "Baza leadów",
    description: "Wspólne miejsce na wyniki scraperów przed przekazaniem ich do CRM.",
    icon: Database,
    status: "Planowane",
  },
];

export default function LeadFactoryPage() {
  return <div className="space-y-7">
    <SectionHeader title="Lead Factory" />

    <LeadFactoryWorkspace />

    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><Factory size={18}/></div>
          <div>
            <h2 className="font-bold text-[#2a3944]">Moduły Lead Factory</h2>
            <div className="text-xs text-[#83909b]">Warstwa sterująca scraperami i przepływem danych</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {modules.map(({ title, description, icon: Icon, status }) => <div key={title} className="rounded-2xl border border-[#e2e8ef] bg-[#fbfcfe] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl bg-white p-2.5 text-[#568deb] shadow-sm ring-1 ring-[#e6ebf1]"><Icon size={19}/></div>
              <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[11px] font-bold text-[#5a76ad]">{status}</span>
            </div>
            <h3 className="mt-4 font-bold text-[#2f3e49]">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#74838f]">{description}</p>
          </div>)}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><Factory size={18}/></div>
          <div>
            <h2 className="font-bold text-[#2a3944]">Docelowy przepływ</h2>
            <div className="text-xs text-[#83909b]">bez przenoszenia logiki scraperów do Salesly OS</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#526674]">
          <span className="rounded-xl border border-[#e0e7ee] bg-white px-3 py-2">Salesly OS</span>
          <ArrowRight size={15}/>
          <span className="rounded-xl border border-[#e0e7ee] bg-white px-3 py-2">GitHub Actions</span>
          <ArrowRight size={15}/>
          <span className="rounded-xl border border-[#e0e7ee] bg-white px-3 py-2">PF Scraper</span>
          <ArrowRight size={15}/>
          <span className="rounded-xl border border-[#e0e7ee] bg-white px-3 py-2">Supabase / paczka wynikowa</span>
          <ArrowRight size={15}/>
          <Link href="/crm" className="rounded-xl bg-[#edf3ff] px-3 py-2 text-[#476fc2] transition hover:bg-[#e4edff]">CRM</Link>
        </div>
      </CardContent>
    </Card>
  </div>;
}
