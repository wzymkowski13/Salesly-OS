import Link from "next/link";
import { BriefcaseBusiness, Factory, Gauge, LineChart, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";

const tiles = [
  {
    title: "Salesly Call Center Panel",
    description: "Leady, efektywność i operacyjna kontrola projektów call center.",
    href: "https://salesly.pl/panel",
    icon: Gauge,
    external: true,
    tone: "from-[#edf3ff] to-[#f7faff] text-[#477ddd]",
  },
  {
    title: "SalesMetrics",
    description: "Analiza jakości rozmów i coaching konsultantów.",
    href: "https://salesmetrics-v2.onrender.com/",
    icon: LineChart,
    external: true,
    tone: "from-[#eef8ff] to-[#f8fcff] text-sky-600",
  },
  {
    title: "LeadFactory",
    description: "Bazy, kwalifikacja rekordów i proces pozyskiwania leadów.",
    href: "/lead-factory",
    icon: Factory,
    external: false,
    tone: "from-amber-50 to-[#fffaf0] text-amber-600",
  },
  {
    title: "Służbowe",
    description: "CRM, zadania, kalendarz, odnowienia i codzienna operacyjka.",
    href: "/dashboard",
    icon: BriefcaseBusiness,
    external: false,
    tone: "from-emerald-50 to-[#f6fffb] text-emerald-600",
  },
  {
    title: "Prywatne",
    description: "Studia, prywatne zadania, kalendarz i finanse.",
    href: "/private",
    icon: UserRound,
    external: false,
    tone: "from-violet-50 to-[#fbf9ff] text-violet-600",
  },
] as const;

export default async function HomePage() {
  await requireUser();

  return <div className="mx-auto max-w-[1180px] space-y-8 py-4 sm:py-8">
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a99a5]">Salesly OS</div>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[#24343f]">Centrum operacyjne</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71808b]">Wybierz środowisko albo narzędzie. Salesly OS ma skracać drogę do pracy, nie dokładać kolejny dashboard do pilnowania.</p>
    </div>

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {tiles.map(({ title, description, href, icon: Icon, external, tone }) => <Link
        key={title}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="group min-h-[190px] rounded-[24px] border border-[#dfe6ee] bg-white p-6 shadow-[0_8px_30px_rgba(31,48,65,.04)] transition-all duration-200 hover:-translate-y-1 hover:border-[#cdd9e6] hover:shadow-[0_18px_45px_rgba(31,48,65,.10)]"
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone}`}>
          <Icon size={22}/>
        </div>
        <div className="mt-7 flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#2a3944]">{title}</h2>
          {external && <span className="text-xs text-[#9aa6af]">↗</span>}
        </div>
        <p className="mt-2 text-sm leading-6 text-[#788792]">{description}</p>
      </Link>)}
    </div>
  </div>;
}
