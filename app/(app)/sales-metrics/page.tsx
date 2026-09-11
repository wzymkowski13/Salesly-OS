import { BarChart3, ExternalLink, Headphones, ShieldCheck } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SalesMetricsPage() {
  return <div className="space-y-7">
    <SectionHeader title="SalesMetrics" />

    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardContent className="p-5">
          <div className="rounded-xl bg-[#edf3ff] p-2.5 text-[#568deb] w-fit"><Headphones size={20}/></div>
          <h2 className="mt-4 font-bold text-[#2a3944]">Audyt rozmów</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#74838f]">Analiza jakości rozmów konsultantów, scoring i rekomendacje coachingowe.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 w-fit"><BarChart3 size={20}/></div>
          <h2 className="mt-4 font-bold text-[#2a3944]">KPI i skuteczność</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#74838f]">Docelowo wspólny widok wyników kampanii, konsultantów i źródeł leadów.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 w-fit"><ShieldCheck size={20}/></div>
          <h2 className="mt-4 font-bold text-[#2a3944]">Integracja etapami</h2>
          <p className="mt-1.5 text-sm leading-6 text-[#74838f]">Na początku Salesly OS pełni rolę huba. Sam silnik SalesMetrics pozostaje osobnym systemem.</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <div>
          <h2 className="font-bold text-[#2a3944]">Połączenie z istniejącym SalesMetrics</h2>
          <div className="mt-1 text-xs text-[#83909b]">Adres aplikacji podepniemy, gdy wskażemy docelowy URL.</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#ccd7e3] bg-[#fafbfd] p-5 text-sm text-[#697b88]">
          <ExternalLink size={18}/>
          <span>Moduł gotowy jako punkt wejścia. Kolejny krok: linkowanie i później wspólne dane.</span>
        </div>
      </CardContent>
    </Card>
  </div>;
}
