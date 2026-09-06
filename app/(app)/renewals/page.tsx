import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

function urgency(days:number) { return days <= 14 ? "red" : days <= 30 ? "amber" : "blue" as const; }

export default async function RenewalsPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: renewals }, { data: anniversaries }] = await Promise.all([
    supabase.from("renewal_queue").select("*").gte("days_left", -30).lte("days_left", 180).order("days_left"),
    supabase.from("anniversary_queue").select("*").gte("days_left", 0).lte("days_left", 90).order("days_left"),
  ]);
  return <div className="space-y-7">
    <SectionHeader title="Odnowienia i rocznice" description="Tu system ma pilnować terminów za was — nie odwrotnie." />
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><div><h2 className="font-semibold">Odnowienia</h2><p className="text-xs text-zinc-500">-30 do +180 dni</p></div><Badge>{renewals?.length || 0}</Badge></CardHeader><CardContent className="space-y-2">
        {(renewals || []).map((r:any)=><Link key={r.policy_id} href={`/crm/${r.client_id}`} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 p-3 hover:bg-zinc-50"><div className="min-w-0"><div className="truncate font-medium">{r.client_name}</div><div className="text-xs text-zinc-500">{r.product_name || r.category} • {r.insurer} • {formatDate(r.renewal_date)}</div></div><Badge variant={r.days_left < 0 ? "red" : urgency(r.days_left)}>{r.days_left < 0 ? `${Math.abs(r.days_left)} dni po` : `${r.days_left} dni`}</Badge></Link>)}
        {!renewals?.length && <EmptyState title="Brak odnowień" description="Dodaj daty odnowień przy polisach."/>}
      </CardContent></Card>
      <Card><CardHeader><div><h2 className="font-semibold">Rocznice</h2><p className="text-xs text-zinc-500">Najbliższe 90 dni</p></div><Badge>{anniversaries?.length || 0}</Badge></CardHeader><CardContent className="space-y-2">
        {(anniversaries || []).map((r:any)=><Link key={r.policy_id} href={`/crm/${r.client_id}`} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 p-3 hover:bg-zinc-50"><div className="min-w-0"><div className="truncate font-medium">{r.client_name}</div><div className="text-xs text-zinc-500">{r.product_name || r.category} • rocznica {formatDate(r.anniversary_date)}</div></div><Badge variant={urgency(r.days_left)}>{r.days_left} dni</Badge></Link>)}
        {!anniversaries?.length && <EmptyState title="Brak rocznic" description="Rocznice są liczone z daty startu polisy."/>}
      </CardContent></Card>
    </div>
  </div>;
}
