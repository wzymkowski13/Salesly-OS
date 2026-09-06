import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
  const notifications:any[] = data || [];
  return <div className="space-y-7">
    <SectionHeader title="Powiadomienia" description="Taski, odnowienia i rocznice, które wymagają uwagi." action={<form action={markAllNotificationsRead}><Button variant="secondary">Oznacz wszystkie jako przeczytane</Button></form>} />
    <div className="space-y-3">{notifications.map(n=><Card key={n.id} className={!n.read_at?"border-zinc-400":""}><CardContent className="flex items-start justify-between gap-4 p-4"><div className="min-w-0"><div className="flex items-center gap-2"><div className="font-medium">{n.title}</div>{!n.read_at&&<Badge variant="blue">nowe</Badge>}</div>{n.body&&<p className="mt-1 text-sm text-zinc-500">{n.body}</p>}<div className="mt-2 text-xs text-zinc-400">{formatDateTime(n.created_at)}</div>{n.href&&<Link href={n.href} className="mt-2 inline-block text-sm font-medium underline underline-offset-4">Przejdź →</Link>}</div>{!n.read_at&&<form action={markNotificationRead.bind(null,n.id)}><Button variant="secondary" size="sm">Przeczytane</Button></form>}</CardContent></Card>)}{!notifications.length&&<EmptyState title="Cisza" description="Nie ma nowych ani historycznych powiadomień."/>}</div>
  </div>;
}
