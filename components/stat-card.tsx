import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, hint, icon: Icon, tone = "blue" }: { label: string; value: string|number; hint?: string; icon: LucideIcon; tone?: "blue"|"green"|"amber"|"slate" }) {
  const tones = {
    blue: { icon: "bg-[#edf3ff] text-[#568deb]", rail: "bg-[#568deb]" },
    green: { icon: "bg-emerald-50 text-emerald-600", rail: "bg-emerald-500" },
    amber: { icon: "bg-amber-50 text-amber-600", rail: "bg-amber-500" },
    slate: { icon: "bg-[#eef2f6] text-[#5d6d79]", rail: "bg-[#90a0ad]" },
  };
  const toneStyle = tones[tone];

  return <Card className="relative overflow-hidden transition-transform duration-150 hover:-translate-y-0.5">
    <div className={`absolute inset-y-4 left-0 w-[3px] rounded-r-full ${toneStyle.rail}`}/>
    <CardContent className="flex items-start justify-between gap-4 p-5 pl-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8795a1]">{label}</p>
        <p className="mt-2 text-[30px] font-bold tracking-[-0.04em] text-[#202d37]">{value}</p>
        {hint && <p className="mt-1 text-xs text-[#7d8b96]">{hint}</p>}
      </div>
      <div className={`rounded-2xl p-2.5 ${toneStyle.icon}`}><Icon size={19}/></div>
    </CardContent>
  </Card>;
}
