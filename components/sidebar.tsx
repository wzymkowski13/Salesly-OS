"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, CheckSquare2, LayoutDashboard, RefreshCcw, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Zadania", icon: CheckSquare2 },
  { href: "/calendar", label: "Kalendarz", icon: CalendarDays },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/renewals", label: "Odnowienia", icon: RefreshCcw },
  { href: "/notifications", label: "Powiadomienia", icon: Bell },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="hidden w-[248px] shrink-0 bg-[#23313c] lg:flex lg:flex-col">
    <div className="flex h-[74px] items-center border-b border-white/10 px-5">
      <img src="/salesly-logo.png" alt="Salesly" className="h-[34px] w-auto object-contain" />
      <span className="ml-2.5 rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">OS</span>
    </div>
    <nav className="flex-1 space-y-1.5 px-3 py-5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
          active ? "bg-[#4f78e7] text-white shadow-sm shadow-blue-950/20" : "text-[#c0cad2] hover:bg-white/5 hover:text-white"
        )}><Icon size={18}/><span>{label}</span></Link>;
      })}
    </nav>
    <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Salesly OS</div>
      <div className="mt-1 text-xs text-white/55">centrum operacyjne</div>
    </div>
  </aside>;
}
