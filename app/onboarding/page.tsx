import { redirect } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserAccess, PERMISSION_GROUPS } from "@/lib/permissions";
import { completeOnboarding } from "@/lib/actions/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default async function OnboardingPage() {
  const user = await requireUser();
  const access = await getUserAccess(user.id);
  const profile = access.profile;

  if (profile?.onboarding_completed_at && profile?.is_active) redirect("/home");

  const granted = PERMISSION_GROUPS.flatMap(group =>
    group.permissions
      .filter(([key]) => access.permissions.has(key) || access.permissions.has("*") || access.permissions.has(group.key + ".*") || access.permissions.has("admin.permissions"))
      .map(([, label]) => label)
  );

  return <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-[760px]">
      <div className="flex justify-center">
        <img src="/salesly-logo.png" alt="Salesly OS" className="h-10 w-auto"/>
      </div>

      <div className="mt-8 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#8b99a4]">Pierwsze uruchomienie</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#263640]">Ustawmy Twój Salesly OS</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#74838f]">Kilka podstawowych ustawień i przechodzisz od razu do swojego środowiska.</p>
      </div>

      <Card className="mt-7">
        <CardContent className="p-6 sm:p-7">
          <form action={completeOnboarding} className="space-y-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6f7d89]">Imię i nazwisko</label>
              <Input name="full_name" required defaultValue={profile?.full_name || user.user_metadata?.full_name || ""} placeholder="Jan Kowalski"/>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-[#6f7d89]">Gdzie chcesz trafiać po zalogowaniu?</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="cursor-pointer rounded-2xl border border-[#dfe6ee] bg-white p-4 transition has-[:checked]:border-[#8eb2f3] has-[:checked]:bg-[#f4f8ff]">
                  <input className="sr-only" type="radio" name="preferred_workspace" value="private" defaultChecked={profile?.preferred_workspace !== "work"}/>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-50 p-2 text-violet-600"><UserRound size={18}/></div>
                    <div><div className="text-sm font-bold text-[#34444f]">Prywatne</div><div className="text-xs text-[#87949f]">Studia, finanse, zadania</div></div>
                  </div>
                </label>
                <label className="cursor-pointer rounded-2xl border border-[#dfe6ee] bg-white p-4 transition has-[:checked]:border-[#8eb2f3] has-[:checked]:bg-[#f4f8ff]">
                  <input className="sr-only" type="radio" name="preferred_workspace" value="work" defaultChecked={profile?.preferred_workspace === "work"}/>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><BriefcaseBusiness size={18}/></div>
                    <div><div className="text-sm font-bold text-[#34444f]">Służbowe</div><div className="text-xs text-[#87949f]">CRM i operacyjka</div></div>
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-2xl bg-[#f7f9fc] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#40515d]"><CheckCircle2 size={16} className="text-emerald-600"/> Twój dostęp</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {granted.length ? granted.slice(0,12).map(label => <Badge key={label} variant="blue">{label}</Badge>) : <span className="text-xs text-[#84929d]">Administrator nie nadał jeszcze modułów.</span>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Zakończ konfigurację</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </main>;
}
