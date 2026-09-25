"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, CalendarDays, CheckSquare2, LayoutDashboard, RefreshCcw, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const workItems = [
  ["/dashboard","Start",LayoutDashboard],
  ["/tasks","Zadania",CheckSquare2],
  ["/calendar","Kalendarz",CalendarDays],
  ["/crm","CRM",Users],
  ["/renewals","Odnowienia",RefreshCcw],
] as const;

const privateItems = [
  ["/private","Start",LayoutDashboard],
  ["/private/tasks","Zadania",CheckSquare2],
  ["/private/calendar","Kalendarz",CalendarDays],
  ["/private/study","Studia",BookOpenCheck],
] as const;

export function MobileNav() {
  const pathname = usePathname();
  if (pathname === "/home") return null;

  const items = pathname.startsWith("/private") ? privateItems : workItems;
  return <nav className={cn(
    "fixed inset-x-3 bottom-3 z-50 grid rounded-2xl border border-[#dbe3ec] bg-white/95 px-1.5 py-1.5 shadow-[0_14px_42px_rgba(31,48,65,.16)] backdrop-blur lg:hidden",
    items.length === 4 ? "grid-cols-4" : "grid-cols-5"
  )}>
    {items.map(([href,label,Icon]) => {
      const active = pathname === href || (href !== "/dashboard" && href !== "/private" && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition", active ? "bg-[#e8f0ff] text-[#315fc9]" : "text-[#748490]")}><Icon size={18}/><span className="truncate">{label}</span></Link>;
    })}
  </nav>;
}
