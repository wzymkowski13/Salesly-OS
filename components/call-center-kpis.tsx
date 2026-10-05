import { Gauge, Target } from "lucide-react";
import { getCallCenterSummary } from "@/lib/call-center-summary";
import { StatCard } from "@/components/stat-card";

function hint(status: "ok" | "unconfigured" | "unavailable") {
  if (status === "ok") return "Call Center Panel";
  if (status === "unconfigured") return "integracja jeszcze niepodłączona";
  return "panel chwilowo niedostępny";
}

export async function CallCenterKpis() {
  const summary = await getCallCenterSummary();

  return <>
    <StatCard
      label="Leady dziś"
      value={summary.leadsToday ?? "—"}
      hint={hint(summary.status)}
      icon={Target}
      tone="green"
    />
    <StatCard
      label="Efektywność dziś"
      value={summary.efficiencyToday === null ? "—" : summary.efficiencyToday.toFixed(2)}
      hint={summary.status === "ok" ? "leadów / RBH" : hint(summary.status)}
      icon={Gauge}
      tone="blue"
    />
  </>;
}

export function CallCenterKpisSkeleton() {
  return <>
    <StatCard label="Leady dziś" value="…" hint="ładowanie panelu" icon={Target} tone="green"/>
    <StatCard label="Efektywność dziś" value="…" hint="leadów / RBH" icon={Gauge} tone="blue"/>
  </>;
}
