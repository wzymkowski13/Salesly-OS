import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("id,email,full_name,is_active,created_at").order("created_at");
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return <div className="space-y-7">
    <SectionHeader title="Ustawienia" description="Użytkownicy i integracje Salesly OS." />
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><h2 className="font-semibold">Dostęp</h2></CardHeader><CardContent className="space-y-3">{(profiles||[]).map((p:any)=><div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 p-3"><div><div className="font-medium">{p.full_name || p.email}</div><div className="text-xs text-zinc-500">{p.email}{p.id===user.id?" • to Ty":""}</div></div><Badge variant={p.is_active?"green":"red"}>{p.is_active?"aktywny":"wyłączony"}</Badge></div>)}<p className="text-xs leading-5 text-zinc-400">W v0.1 dostęp jest kontrolowany przez ALLOWED_EMAILS oraz profil Supabase. Panel administracyjny ról dołożymy po ustabilizowaniu rdzenia.</p></CardContent></Card>
      <Card><CardHeader><h2 className="font-semibold">Integracje</h2></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 p-4"><div><div className="font-medium">Google Calendar</div><div className="mt-1 text-xs text-zinc-500">Dwukierunkowa synchronizacja jest przewidziana w architekturze eventów.</div></div><Badge variant={googleConfigured?"amber":"neutral"}>{googleConfigured?"credentials gotowe":"do konfiguracji"}</Badge></div><div className="rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">v0.1 zapisuje wydarzenia we własnym kalendarzu. Kolejny krok integracyjny to OAuth Google + mapowanie <code>google_event_id</code> i <code>google_calendar_id</code>, które baza już posiada.</div></CardContent></Card>
    </div>
  </div>;
}
