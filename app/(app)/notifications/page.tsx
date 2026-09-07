import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
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
  const unread = notifications.filter(n=>!n.read_at).length;
  return <div className="space-y-6">
    <SectionHeader title="Powiadomienia" action={unread > 0 ? <form action={markAllNotificationsRead}><Button variant="secondary"><CheckCheck size={16}/> Oznacz wszystkie</Button></form> : undefined} />
    <div className="space-y-3">
      {notifications.map(n=><Card key={n.id} className={!n.read_at ? "border-[#ccd9ff] bg-[#fbfcff]" : ""}><CardContent className="flex items-start gap-4 p-4">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${!n.read_at ? "bg-[#eef3ff] text-[#4f78e7]" : "bg-[#f1f4f7] text-[#7d8b96]"}`}><Bell size={17}/></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-sm font-bold text-[#34434e]">{n.title}</div>{!n.read_at&&<Badge variant="blue">Nowe</Badge>}</div>{n.body&&<p className="mt-1 text-sm leading-6 text-[#6f7e89]">{n.body}</p>}<div className="mt-2 text-xs text-[#9aa5ae]">{formatDateTime(n.created_at)}</div>{n.href&&<Link href={n.href} className="mt-2 inline-flex text-sm font-semibold text-[#4f78e7] hover:text-[#3d67dc]">Przejdź →</Link>}</div>
        {!n.read_at&&<form action={markNotificationRead.bind(null,n.id)}><Button variant="ghost" size="sm">Przeczytane</Button></form>}
      </CardContent></Card>)}
      {!notifications.length&&<EmptyState title="Brak powiadomień" description="Lista jest pusta."/>}
    </div>
  </div>;
}
