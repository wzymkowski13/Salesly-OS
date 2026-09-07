import Link from "next/link";
import { CalendarDays, RefreshCcw } from "lucide-react";
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
  return <div className="space-y-6">
    <SectionHeader title="Odnowienia" />
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><RefreshCcw size={18}/></div><div><h2 className="font-bold text-[#30404b]">Polisy do odnowienia</h2><div className="text-xs text-[#87949f]">najbliższe 180 dni</div></div></div><Badge>{renewals?.length || 0}</Badge></CardHeader>
        <CardContent className="space-y-2">
          {(renewals || []).map((r:any)=><Link key={r.policy_id} href={`/crm/${r.client_id}`} className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-[#e6ebf1] hover:bg-[#f8fafc]"><div className="min-w-0"><div className="truncate text-sm font-bold text-[#354550]">{r.client_name}</div><div className="mt-0.5 text-xs text-[#84919c]">{r.product_name || r.category} · {r.insurer} · {formatDate(r.renewal_date)}</div></div><Badge variant={r.days_left < 0 ? "red" : urgency(r.days_left)}>{r.days_left < 0 ? `${Math.abs(r.days_left)} dni po` : `${r.days_left} dni`}</Badge></Link>)}
          {!renewals?.length && <EmptyState title="Brak odnowień" description="Nie ma polis z datą odnowienia w tym zakresie."/>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><div className="flex items-center gap-2.5"><div className="rounded-xl bg-[#eef3ff] p-2 text-[#4f78e7]"><CalendarDays size={18}/></div><div><h2 className="font-bold text-[#30404b]">Rocznice polis</h2><div className="text-xs text-[#87949f]">najbliższe 90 dni</div></div></div><Badge>{anniversaries?.length || 0}</Badge></CardHeader>
        <CardContent className="space-y-2">
          {(anniversaries || []).map((r:any)=><Link key={r.policy_id} href={`/crm/${r.client_id}`} className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-[#e6ebf1] hover:bg-[#f8fafc]"><div className="min-w-0"><div className="truncate text-sm font-bold text-[#354550]">{r.client_name}</div><div className="mt-0.5 text-xs text-[#84919c]">{r.product_name || r.category} · {formatDate(r.anniversary_date)}</div></div><Badge variant={urgency(r.days_left)}>{r.days_left} dni</Badge></Link>)}
          {!anniversaries?.length && <EmptyState title="Brak rocznic" description="Nie ma rocznic polis w tym zakresie."/>}
        </CardContent>
      </Card>
    </div>
  </div>;
}
