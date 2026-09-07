import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, hint, icon: Icon, tone = "blue" }: { label: string; value: string|number; hint?: string; icon: LucideIcon; tone?: "blue"|"green"|"amber"|"slate" }) {
  const tones = {
    blue: "bg-[#eef3ff] text-[#4f78e7]",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-[#f0f3f6] text-[#556571]",
  };
  return <Card className="overflow-hidden"><CardContent className="flex items-start justify-between gap-4 p-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b98a3]">{label}</p><p className="mt-2 text-[30px] font-bold tracking-[-0.04em] text-[#24333e]">{value}</p>{hint && <p className="mt-1 text-xs text-[#7b8994]">{hint}</p>}</div>
    <div className={`rounded-2xl p-2.5 ${tones[tone]}`}><Icon size={19}/></div>
  </CardContent></Card>;
}
