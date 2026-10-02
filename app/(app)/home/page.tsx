import Link from "next/link";
import { BriefcaseBusiness, Factory, Gauge, LineChart, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserAccess, permissionSetAllows } from "@/lib/permissions";

export default async function HomePage() {
  const user = await requireUser();
  const access = await getUserAccess(user.id);
  const permissions = access.permissions;

  const firstAllowed = (candidates: Array<[string,string]>) =>
    candidates.find(([,permission]) => permissionSetAllows(permissions, permission))?.[0] || null;

  const workHref = firstAllowed([
    ["/dashboard","work.dashboard"],
    ["/crm","work.crm"],
    ["/tasks","work.tasks"],
    ["/calendar","work.calendar"],
    ["/renewals","work.renewals"],
  ]);

  const privateHref = firstAllowed([
    ["/private","private.dashboard"],
    ["/private/study","private.study"],
    ["/private/finance","private.finance"],
    ["/private/tasks","private.tasks"],
    ["/private/calendar","private.calendar"],
    ["/private/documents","private.documents"],
  ]);

  const tiles = [
    permissionSetAllows(permissions, "external.callcenter") ? {
      title: "Salesly Call Center Panel",
      description: "Leady, efektywność i operacyjna kontrola projektów call center.",
      href: "https://salesly.pl/panel",
      icon: Gauge,
      external: true,
      tone: "from-[#edf3ff] to-[#f7faff] text-[#477ddd]",
    } : null,
    permissionSetAllows(permissions, "external.salesmetrics") ? {
      title: "SalesMetrics",
      description: "Analiza jakości rozmów i coaching konsultantów.",
      href: "https://salesmetrics-v2.onrender.com/",
      icon: LineChart,
      external: true,
      tone: "from-[#eef8ff] to-[#f8fcff] text-sky-600",
    } : null,
    permissionSetAllows(permissions, "leadfactory.access") ? {
      title: "LeadFactory",
      description: "Bazy, kwalifikacja rekordów i proces pozyskiwania leadów.",
      href: "/lead-factory",
      icon: Factory,
      external: false,
      tone: "from-amber-50 to-[#fffaf0] text-amber-600",
    } : null,
    workHref ? {
      title: "Służbowe",
      description: "CRM, zadania, kalendarz, odnowienia i codzienna operacyjka.",
      href: workHref,
      icon: BriefcaseBusiness,
      external: false,
      tone: "from-emerald-50 to-[#f6fffb] text-emerald-600",
    } : null,
    privateHref ? {
      title: "Prywatne",
      description: "Studia, prywatne zadania, kalendarz i finanse.",
      href: privateHref,
      icon: UserRound,
      external: false,
      tone: "from-violet-50 to-[#fbf9ff] text-violet-600",
    } : null,
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    href: string;
    icon: typeof Gauge;
    external: boolean;
    tone: string;
  }>;

  return <div className="mx-auto max-w-[1180px] space-y-8 py-4 sm:py-8">
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a99a5]">Salesly OS</div>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-[#24343f]">Centrum operacyjne</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71808b]">Widzisz wyłącznie środowiska i narzędzia dostępne w Twoim profilu.</p>
    </div>

    {tiles.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
    </div> : <div className="rounded-[24px] border border-dashed border-[#d7dfe8] bg-white px-6 py-12 text-center">
      <div className="text-lg font-bold text-[#34444f]">Brak przypisanych modułów</div>
      <div className="mt-2 text-sm text-[#7b8a95]">Administrator musi nadać Ci przynajmniej jedno uprawnienie.</div>
    </div>}
  </div>;
}
