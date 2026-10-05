export type CallCenterSummary = {
  status: "ok" | "unconfigured" | "unavailable";
  leadsToday: number | null;
  efficiencyToday: number | null;
  generatedAt: string | null;
};

export async function getCallCenterSummary(): Promise<CallCenterSummary> {
  const url = String(process.env.CALL_CENTER_SUMMARY_URL || "").trim();
  const token = String(process.env.CALL_CENTER_SUMMARY_TOKEN || "").trim();

  if (!url) {
    return {
      status: "unconfigured",
      leadsToday: null,
      efficiencyToday: null,
      generatedAt: null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
      next: { revalidate: 45 },
    });

    if (!response.ok) throw new Error(`Call Center summary HTTP ${response.status}`);

    const payload = await response.json();
    const leadsToday = Number(payload?.leads_today);
    const efficiencyToday = Number(payload?.efficiency_today);

    if (
      !Number.isFinite(leadsToday)
      || leadsToday < 0
      || !Number.isFinite(efficiencyToday)
      || efficiencyToday < 0
    ) {
      throw new Error("Invalid Call Center summary payload");
    }

    return {
      status: "ok",
      leadsToday: Math.round(leadsToday),
      efficiencyToday: Math.round(efficiencyToday * 100) / 100,
      generatedAt: typeof payload?.generated_at === "string" ? payload.generated_at : null,
    };
  } catch {
    return {
      status: "unavailable",
      leadsToday: null,
      efficiencyToday: null,
      generatedAt: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
