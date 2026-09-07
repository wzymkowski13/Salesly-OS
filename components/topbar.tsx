import Link from "next/link";
import { Bell, LogOut, Search } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function Topbar({ email, unread }: { email: string; unread: number }) {
  const initial = (email?.[0] || "S").toUpperCase();
  return <header className="sticky top-0 z-40 flex h-[74px] items-center justify-between border-b border-[#e6ebf1] bg-white/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex items-center gap-2 lg:hidden"><img src="/salesly-logo.png" alt="Salesly" className="h-8 w-auto"/><span className="rounded-md bg-[#eef3ff] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4f78e7]">OS</span></div>
      <Link href="/crm" className="hidden h-10 min-w-[230px] items-center gap-2 rounded-xl border border-[#e0e6ed] bg-[#f9fbfd] px-3 text-sm text-[#86939e] transition hover:border-[#cfd8e3] hover:bg-white sm:flex"><Search size={16}/><span>Szukaj w CRM</span><span className="ml-auto rounded-md border border-[#e3e8ee] bg-white px-1.5 py-0.5 text-[10px] text-[#a1abb4]">CRM</span></Link>
    </div>
    <div className="flex items-center gap-2">
      <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#637380] transition hover:bg-[#f0f4f8] hover:text-[#2b3a45]"><Bell size={19}/>{unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[#4f78e7] px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>}</Link>
      <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#eef3ff] text-xs font-bold text-[#456edb] md:flex">{initial}</div>
      <span className="hidden max-w-44 truncate text-xs font-medium text-[#657580] xl:block">{email}</span>
      <form action={signOut}><Button variant="ghost" size="icon" title="Wyloguj"><LogOut size={17}/></Button></form>
    </div>
  </header>;
}
