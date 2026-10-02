"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, CalendarDays, CheckSquare2, LayoutDashboard, RefreshCcw, Users, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileItem = readonly [string,string,typeof LayoutDashboard,string];

const workItems: MobileItem[] = [
  ["/dashboard","Start",LayoutDashboard,"work.dashboard"],
  ["/tasks","Zadania",CheckSquare2,"work.tasks"],
  ["/calendar","Kalendarz",CalendarDays,"work.calendar"],
  ["/crm","CRM",Users,"work.crm"],
  ["/renewals","Odnowienia",RefreshCcw,"work.renewals"],
];

const privateItems: MobileItem[] = [
  ["/private","Start",LayoutDashboard,"private.dashboard"],
  ["/private/tasks","Zadania",CheckSquare2,"private.tasks"],
  ["/private/calendar","Kalendarz",CalendarDays,"private.calendar"],
  ["/private/study","Studia",BookOpenCheck,"private.study"],
  ["/private/finance","Finanse",WalletCards,"private.finance"],
];

function allows(permissions: Set<string>, permission: string) {
  if (permissions.has("*") || permissions.has("admin.permissions") || permissions.has(permission)) return true;
  const namespace = permission.split(".")[0];
  return permissions.has(`${namespace}.*`);
}

export function MobileNav({ permissions: permissionList }: { permissions: string[] }) {
  const pathname = usePathname();
  if (pathname === "/home") return null;

  const permissions = new Set(permissionList);
  const raw = pathname.startsWith("/private") ? privateItems : workItems;
  const items = raw.filter(([, , , permission]) => allows(permissions, permission));
  if (!items.length) return null;

  const columns = items.length >= 5 ? "grid-cols-5" : items.length === 4 ? "grid-cols-4" : items.length === 3 ? "grid-cols-3" : items.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return <nav className={cn(
    "fixed inset-x-3 bottom-3 z-50 grid rounded-2xl border border-[#dbe3ec] bg-white/95 px-1.5 py-1.5 shadow-[0_14px_42px_rgba(31,48,65,.16)] backdrop-blur lg:hidden",
    columns
  )}>
    {items.map(([href,label,Icon]) => {
      const active = pathname === href || (href !== "/dashboard" && href !== "/private" && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition", active ? "bg-[#e8f0ff] text-[#315fc9]" : "text-[#748490]")}><Icon size={18}/><span className="truncate">{label}</span></Link>;
    })}
  </nav>;
}
