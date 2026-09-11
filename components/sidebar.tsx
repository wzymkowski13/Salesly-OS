"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckSquare2,
  Factory,
  LayoutDashboard,
  RefreshCcw,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
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
      { href: "/renewals", label: "Odnowienia", icon: RefreshCcw },
    ],
  },
  {
    label: "Call Center",
    items: [
      { href: "/sales-metrics", label: "SalesMetrics", icon: BarChart3 },
    ],
  },
  {
    label: "Leady",
    items: [
      { href: "/lead-factory", label: "Lead Factory", icon: Factory },
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
];

export function Sidebar() {
  const pathname = usePathname();

  return <aside className="hidden w-[236px] shrink-0 border-r border-[#dfe6ee] bg-[#f7f9fc] lg:flex lg:flex-col">
    <div className="flex h-[74px] items-center border-b border-[#e5ebf1] px-5">
      <div className="flex min-w-0 items-center">
        <img src="/salesly-logo.png" alt="Salesly OS" className="h-[32px] w-auto max-w-[170px] object-contain" />
      </div>
    </div>

    <nav className="flex-1 overflow-y-auto px-3 py-5">
      <div className="space-y-5">
        {sections.map((section, index) => <div key={section.label || `section-${index}`}>
          {section.label && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa7b2]">{section.label}</div>}
          <div className="space-y-1">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

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

    <div className="px-3 pb-4">
      <div className="rounded-2xl border border-[#dfe7f0] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(31,48,65,.035)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7e8d99]">Salesly OS</div>
        <div className="mt-1 text-xs font-medium text-[#536674]">Centrum operacyjne</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf2f7]">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#7f9bed] to-[#568deb]"/>
        </div>
      </div>
    </div>
  </aside>;
}
