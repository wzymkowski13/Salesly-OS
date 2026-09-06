import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Topbar } from "@/components/topbar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
  return <div className="flex min-h-screen bg-zinc-50">
    <Sidebar />
    <div className="min-w-0 flex-1">
      <Topbar email={user.email || ""} unread={count || 0}/>
      <main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</main>
    </div>
    <MobileNav />
  </div>;
}
