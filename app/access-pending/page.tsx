import { redirect } from "next/navigation";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserAccess } from "@/lib/permissions";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AccessPendingPage() {
  const user = await requireUser();
  const access = await getUserAccess(user.id);
  if (access.profile?.is_active && access.profile?.onboarding_completed_at) redirect("/home");
  if (access.profile?.is_active && !access.profile?.onboarding_completed_at) redirect("/onboarding");

  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10">
    <Card className="w-full max-w-[560px]">
      <CardContent className="p-7 text-center sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Clock3 size={24}/></div>
        <div className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#9a8765]">Dostęp oczekuje</div>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#2b3b46]">Konto nie jest jeszcze aktywne</h1>
        <p className="mt-3 text-sm leading-6 text-[#74838f]">Administrator Salesly OS musi aktywować konto i nadać zakres dostępu. Po aktywacji wystarczy zalogować się ponownie.</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f7f9fc] px-3 py-2 text-xs font-semibold text-[#647581]"><ShieldCheck size={14}/> {user.email}</div>
        <form action={signOut} className="mt-6"><Button type="submit" variant="secondary"><LogOut size={15}/> Wyloguj</Button></form>
      </CardContent>
    </Card>
  </main>;
}
