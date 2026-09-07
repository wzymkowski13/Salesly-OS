import { CalendarDays, ShieldCheck, Users } from "lucide-react";
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
  return <div className="space-y-6">
    <SectionHeader title="Ustawienia" />
    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><Users size={18}/></div><h2 className="font-bold text-[#30404b]">Użytkownicy</h2></div></CardHeader><CardContent className="space-y-3">{(profiles||[]).map((p:any)=><div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#e7ecf1] bg-[#fbfcfe] p-3.5"><div><div className="text-sm font-bold text-[#3a4a55]">{p.full_name || p.email}</div><div className="mt-0.5 text-xs text-[#87949f]">{p.email}{p.id===user.id?" · to Ty":""}</div></div><Badge variant={p.is_active?"green":"red"}>{p.is_active?"Aktywny":"Wyłączony"}</Badge></div>)}</CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><ShieldCheck size={18}/></div><h2 className="font-bold text-[#30404b]">Dostęp</h2></div></CardHeader><CardContent><div className="rounded-xl border border-[#e7ecf1] bg-[#fbfcfe] p-4"><div className="text-sm font-bold text-[#3a4a55]">Google + whitelist</div><div className="mt-1 text-xs leading-5 text-[#7f8d98]">Dostęp do panelu mają wyłącznie aktywne, zatwierdzone konta.</div></div></CardContent></Card>
      <Card className="xl:col-span-2"><CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><CalendarDays size={18}/></div><h2 className="font-bold text-[#30404b]">Integracje</h2></div></CardHeader><CardContent><div className="flex items-center justify-between gap-4 rounded-xl border border-[#e7ecf1] bg-[#fbfcfe] p-4"><div><div className="text-sm font-bold text-[#3a4a55]">Google Calendar</div><div className="mt-1 text-xs text-[#7f8d98]">Synchronizacja zostanie podłączona w kolejnym etapie.</div></div><Badge variant={googleConfigured?"amber":"neutral"}>{googleConfigured?"Gotowe do podłączenia":"Niepodłączone"}</Badge></div></CardContent></Card>
    </div>
  </div>;
}
