"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckSquare2,
  Files,
  Factory,
  GitBranch,
  LayoutDashboard,
  RefreshCcw,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

const workSections = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Sprzedaż",
    items: [
      { href: "/crm", label: "CRM", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: GitBranch },
      { href: "/renewals", label: "Odnowienia", icon: RefreshCcw },
    ],
  },
  {
    label: "Organizacja",
    items: [
      { href: "/tasks", label: "Zadania", icon: CheckSquare2 },
      { href: "/calendar", label: "Kalendarz", icon: CalendarDays },
      { href: "/notifications", label: "Powiadomienia", icon: Bell },
    ],
  },
  {
    label: "Leady",
    items: [
      { href: "/lead-factory", label: "LeadFactory", icon: Factory },
    ],
  },
];

const privateSections = [
  {
    label: null,
    items: [
      { href: "/private", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Organizacja",
    items: [
      { href: "/private/tasks", label: "Zadania", icon: CheckSquare2 },
      { href: "/private/calendar", label: "Kalendarz", icon: CalendarDays },
    ],
  },
  {
    label: "Prywatne",
    items: [
      { href: "/private/study", label: "Studia", icon: BookOpenCheck },
      { href: "/private/finance", label: "Finanse", icon: WalletCards },
      { href: "/private/documents", label: "Dokumenty", icon: Files },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  if (pathname === "/home") return null;

  const isPrivate = pathname.startsWith("/private");
  const sections = isPrivate ? privateSections : workSections;

  return <aside className="hidden w-[236px] shrink-0 border-r border-[#dfe6ee] bg-[#f7f9fc] lg:flex lg:flex-col">
    <div className="flex h-[74px] items-center border-b border-[#e5ebf1] px-5">
      <Link href="/home" className="flex min-w-0 items-center" title="Salesly OS — Start">
        <img src="/salesly-logo.png" alt="Salesly OS" className="h-[32px] w-auto max-w-[170px] object-contain" />
      </Link>
    </div>

    <div className="px-4 pt-4">
      <div className="rounded-xl border border-[#e1e8ef] bg-white px-3 py-2.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#9aa6af]">Środowisko</div>
        <div className="mt-0.5 text-sm font-bold text-[#334550]">{isPrivate ? "Prywatne" : "Służbowe"}</div>
      </div>
    </div>

    <nav className="flex-1 overflow-y-auto px-3 py-5">
      <div className="space-y-5">
        {sections.map((section, index) => <div key={section.label || `section-${index}`}>
          {section.label && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa7b2]">{section.label}</div>}
          <div className="space-y-1">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/private" && href !== "/dashboard" && pathname.startsWith(`${href}/`));

              return <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                  active
                    ? "bg-[#e8f0ff] text-[#315fc9] shadow-[inset_0_0_0_1px_rgba(86,141,235,.14)]"
                    : "text-[#5f7180] hover:bg-[#eef3f8] hover:text-[#263641]"
                )}
              >
                <span className={cn(
                  "absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full transition-opacity",
                  active ? "bg-[#568deb] opacity-100" : "opacity-0"
                )}/>
                <Icon size={18} className={cn(active ? "text-[#568deb]" : "text-[#82919d] group-hover:text-[#60717e]")}/>
                <span>{label}</span>
              </Link>;
            })}
          </div>
        </div>)}
      </div>
    </nav>

    <div className="border-t border-[#e5ebf1] px-3 py-3">
      <Link
        href="/settings"
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150",
          pathname.startsWith("/settings")
            ? "bg-[#e8f0ff] text-[#315fc9] shadow-[inset_0_0_0_1px_rgba(86,141,235,.14)]"
            : "text-[#5f7180] hover:bg-[#eef3f8] hover:text-[#263641]"
        )}
      >
        <Settings size={18} className={pathname.startsWith("/settings") ? "text-[#568deb]" : "text-[#82919d]"}/>
        <span>Ustawienia</span>
      </Link>
    </div>
  </aside>;
}
