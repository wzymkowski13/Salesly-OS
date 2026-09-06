import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string|number; hint?: string; icon: LucideIcon }) {
  return <Card><CardContent className="flex items-start justify-between gap-4">
    <div><p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>{hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}</div>
    <div className="rounded-xl bg-zinc-100 p-2.5 text-zinc-600"><Icon size={19}/></div>
  </CardContent></Card>;
}
