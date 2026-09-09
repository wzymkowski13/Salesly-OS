import Link from "next/link";
import { Bell, LogOut, Search } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function Topbar({ email, unread }: { email: string; unread: number }) {
  const initial = (email?.[0] || "S").toUpperCase();

  return <header className="sticky top-0 z-40 flex h-[74px] items-center justify-between border-b border-[#e3e9f0] bg-white/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex items-center gap-2 lg:hidden">
        <img src="/salesly-logo.png" alt="Salesly OS" className="h-8 w-auto max-w-[150px] object-contain"/>
      </div>
      <Link href="/crm" className="hidden h-10 min-w-[230px] items-center gap-2 rounded-xl border border-[#dfe6ee] bg-[#f8fafc] px-3 text-sm text-[#81909b] transition hover:border-[#ced9e4] hover:bg-white hover:text-[#5f7180] sm:flex">
        <Search size={16}/>
        <span>Szukaj w CRM</span>
        <span className="ml-auto rounded-md border border-[#e0e7ef] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#95a1aa]">CRM</span>
      </Link>
    </div>
    <div className="flex items-center gap-2">
      <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#647582] transition hover:bg-[#eef3f8] hover:text-[#263641]">
        <Bell size={19}/>
        {unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[#568deb] px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>}
      </Link>
      <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#dce7fb] bg-[#edf3ff] text-xs font-bold text-[#477ddd] md:flex">{initial}</div>
      <span className="hidden max-w-44 truncate text-xs font-medium text-[#60717e] xl:block">{email}</span>
      <form action={signOut}><Button variant="ghost" size="icon" title="Wyloguj"><LogOut size={17}/></Button></form>
    </div>
  </header>;
}
