import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import { getRunArtifacts, listRecentPfRuns } from "@/lib/github/pf";

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user && isAllowedEmail(user.email));
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  try {
    const runs = await listRecentPfRuns();
    const enriched = await Promise.all(runs.map(async (run) => ({
      ...run,
      artifacts: run.status === "completed" ? await getRunArtifacts(run.id) : [],
    })));
    return NextResponse.json({ runs: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się pobrać historii runów.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
