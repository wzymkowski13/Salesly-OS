import Link from "next/link";
import { ArrowRight, BarChart3, DatabaseZap, ExternalLink, ServerCog } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const modules = [
  {
    href: "/sales-metrics",
    title: "SalesMetrics",
    description: "Audyt rozmów, scoring konsultantów i KPI jakościowe.",
    icon: BarChart3,
    badge: "Call Center",
    status: "Moduł gotowy",
  },
  {
    href: "/lead-factory",
    title: "Lead Factory",
    description: "Firmy 10+, JDG, kampanie scraperów i import leadów.",
    icon: DatabaseZap,
    badge: "Leady",
    status: "Hub gotowy",
  },
];

export function EcosystemOverview() {
  return (
    <Card>
      <CardHeader>
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]">
              <ServerCog size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[#2a3944]">Ekosystem Salesly</h2>
              <div className="text-xs text-[#83909b]">Jedno centrum wejścia do narzędzi operacyjnych</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-2">
          {modules.map(({ href, title, description, icon: Icon, badge, status }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-[#e4eaf1] bg-[#fbfcfe] p-4 transition hover:-translate-y-0.5 hover:border-[#cfdbea] hover:bg-white hover:shadow-[0_10px_28px_rgba(31,48,65,.06)]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2.5 text-[#568deb] shadow-sm ring-1 ring-[#e7edf4]">
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold text-[#2f3f4a]">{title}</div>
                    <span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#568deb]">{badge}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-[#71808b]">{description}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-emerald-600">{status}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5f79ad] transition group-hover:text-[#3e6fd4]">
                      Otwórz <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-dashed border-[#d9e2ec] bg-[#fafbfd] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#40505c]">
              <ExternalLink size={15} /> os.salesly.pl
            </div>
            <div className="mt-1 text-xs text-[#84919c]">Docelowy adres Salesly OS · konfiguracja domeny przed nami</div>
          </div>
          <div className="rounded-xl border border-dashed border-[#d9e2ec] bg-[#fafbfd] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#40505c]">
              <ExternalLink size={15} /> salesmetrics.salesly.pl
            </div>
            <div className="mt-1 text-xs text-[#84919c]">Docelowy adres SalesMetrics · Render może zostać hostingiem</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
