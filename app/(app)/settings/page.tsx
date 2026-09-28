import { CalendarDays, Link2, ShieldCheck, Unlink, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getGoogleIntegration } from "@/lib/google";
import { disconnectGoogle } from "@/lib/actions/google-study";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("id,email,full_name,is_active,created_at").order("created_at");
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  let googleIntegration: Awaited<ReturnType<typeof getGoogleIntegration>> = null;
  try {
    googleIntegration = await getGoogleIntegration(user.id);
  } catch {}

  return <div className="space-y-6">
    <SectionHeader title="Ustawienia" />

    {params.google === "connected" && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Google zostało podłączone do Salesly OS.</div>}
    {params.google === "error" && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">Nie udało się podłączyć Google. Sprawdź konfigurację OAuth i spróbuj ponownie.</div>}

    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><Users size={18}/></div><h2 className="font-bold text-[#30404b]">Użytkownicy</h2></div></CardHeader><CardContent className="space-y-3">{(profiles||[]).map((p:any)=><div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#e7ecf1] bg-[#fbfcfe] p-3.5"><div><div className="text-sm font-bold text-[#3a4a55]">{p.full_name || p.email}</div><div className="mt-0.5 text-xs text-[#87949f]">{p.email}{p.id===user.id?" · to Ty":""}</div></div><Badge variant={p.is_active?"green":"red"}>{p.is_active?"Aktywny":"Wyłączony"}</Badge></div>)}</CardContent></Card>

      <Card><CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><ShieldCheck size={18}/></div><h2 className="font-bold text-[#30404b]">Dostęp</h2></div></CardHeader><CardContent><div className="rounded-xl border border-[#e7ecf1] bg-[#fbfcfe] p-4"><div className="text-sm font-bold text-[#3a4a55]">Google + whitelist</div><div className="mt-1 text-xs leading-5 text-[#7f8d98]">Dostęp do panelu mają wyłącznie aktywne, zatwierdzone konta.</div></div></CardContent></Card>

      <Card className="xl:col-span-2">
        <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><CalendarDays size={18}/></div><div><h2 className="font-bold text-[#30404b]">Google Workspace</h2><div className="text-xs text-[#83909b]">Calendar + Google Docs / Drive</div></div></div></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 rounded-2xl border border-[#e7ecf1] bg-[#fbfcfe] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-[#3a4a55]">Google Calendar i notatki</div>
                <Badge variant={googleIntegration ? "green" : googleConfigured ? "amber" : "neutral"}>{googleIntegration ? "Podłączone" : googleConfigured ? "Gotowe do połączenia" : "Wymaga konfiguracji"}</Badge>
              </div>
              <div className="mt-1 text-xs leading-5 text-[#7f8d98]">
                {googleIntegration
                  ? <>Konto: <span className="font-semibold text-[#566874]">{googleIntegration.connected_email || "Google"}</span>. OS może importować wydarzenia z kalendarza i tworzyć dokumenty w Twoim Dysku.</>
                  : "Podłącz konto, aby importować plan studiów z Google Calendar i tworzyć notatki Google Docs z poziomu przedmiotu."}
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {googleIntegration ? <>
                <a href="/api/google/connect" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#dbe3ec] bg-white px-4 text-sm font-semibold text-[#31424e] transition hover:bg-[#f8fafc]"><Link2 size={15}/> Połącz ponownie</a>
                <form action={disconnectGoogle}><Button type="submit" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700"><Unlink size={15}/> Odłącz</Button></form>
              </> : googleConfigured ? <a href="/api/google/connect" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#4f84e7] bg-[#568deb] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(86,141,235,.18)] transition hover:bg-[#477ddd]"><Link2 size={15}/> Podłącz Google</a> : <Badge variant="neutral">Dodaj GOOGLE_CLIENT_ID / SECRET</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>;
}
