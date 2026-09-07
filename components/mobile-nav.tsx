"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare2, LayoutDashboard, RefreshCcw, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  ["/dashboard","Start",LayoutDashboard], ["/tasks","Zadania",CheckSquare2], ["/calendar","Kalendarz",CalendarDays], ["/crm","CRM",Users], ["/renewals","Odnowienia",RefreshCcw]
] as const;

export function MobileNav() {
  const pathname = usePathname();
  return <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border border-[#dfe6ee] bg-white/95 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(31,48,65,.18)] backdrop-blur lg:hidden">
    {items.map(([href,label,Icon]) => {
      const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition", active ? "bg-[#eef3ff] text-[#456edb]" : "text-[#7b8994]")}><Icon size={18}/><span className="truncate">{label}</span></Link>;
    })}
  </nav>;
}
