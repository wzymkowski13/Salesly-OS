import Link from "next/link";
import { CalendarDays, CheckSquare, LayoutDashboard, RefreshCcw, Settings, Users, Bell } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Taski", icon: CheckSquare },
  { href: "/calendar", label: "Kalendarz", icon: CalendarDays },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/renewals", label: "Odnowienia", icon: RefreshCcw },
  { href: "/notifications", label: "Powiadomienia", icon: Bell },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

export function Sidebar() {
  return <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
    <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-xs font-bold text-white">SO</div>
      <div><div className="text-sm font-semibold">Salesly OS</div><div className="text-xs text-zinc-400">Operations Hub</div></div>
    </div>
    <nav className="flex-1 space-y-1 p-3">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"><Icon size={18}/>{label}</Link>)}
    </nav>
    <div className="border-t border-zinc-100 p-4 text-xs leading-5 text-zinc-400">v0.1 • prywatne środowisko Salesly</div>
  </aside>;
}
