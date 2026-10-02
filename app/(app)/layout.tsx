import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Topbar } from "@/components/topbar";
import { requireUser } from "@/lib/auth";
import { getUserAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/toast-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const access = await getUserAccess(user.id);

  if (!access.profile?.is_active) redirect("/access-pending");
  if (!access.profile?.onboarding_completed_at) redirect("/onboarding");

  const permissions = [...access.permissions];
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return <ToastProvider><div className="flex min-h-screen bg-[#f5f7fb]">
    <Sidebar permissions={permissions} />
    <div className="min-w-0 flex-1">
      <Topbar email={user.email || ""} unread={count || 0} permissions={permissions}/>
      <main className="mx-auto max-w-[1520px] p-4 pb-24 sm:p-6 lg:p-8 lg:pb-10">{children}</main>
    </div>
    <MobileNav permissions={permissions}/>
  </div></ToastProvider>;
}
