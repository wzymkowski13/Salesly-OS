import Link from "next/link";
import { CalendarDays, CheckSquare, LayoutDashboard, Users, RefreshCcw } from "lucide-react";
const items = [
  ["/dashboard","Start",LayoutDashboard], ["/tasks","Taski",CheckSquare], ["/calendar","Kalendarz",CalendarDays], ["/crm","CRM",Users], ["/renewals","Odnowienia",RefreshCcw]
] as const;
export function MobileNav() {
  return <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
    {items.map(([href,label,Icon]) => <Link key={href} href={href} className="flex flex-col items-center gap-1 rounded-lg py-1 text-[11px] text-zinc-600"><Icon size={18}/>{label}</Link>)}
  </nav>;
}
