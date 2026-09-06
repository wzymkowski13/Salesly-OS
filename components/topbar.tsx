import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function Topbar({ email, unread }: { email: string; unread: number }) {
  return <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <div className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-[11px] font-bold text-white">SO</div>
      <Link href="/crm" className="hidden items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-500 sm:flex"><Search size={16}/>Szukaj w CRM</Link>
    </div>
    <div className="flex items-center gap-2">
      <Link href="/notifications" className="relative rounded-xl p-2 text-zinc-600 hover:bg-zinc-100"><Bell size={19}/>{unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-zinc-950 px-1 text-center text-[10px] leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}</Link>
      <span className="hidden max-w-48 truncate text-xs text-zinc-500 md:block">{email}</span>
      <form action={signOut}><Button variant="secondary" size="sm">Wyloguj</Button></form>
    </div>
  </header>;
}
