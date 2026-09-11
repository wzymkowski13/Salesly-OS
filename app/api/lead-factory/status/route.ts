import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import { findRunByRequestId, getRunArtifacts } from "@/lib/github/pf";

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user && isAllowedEmail(user.email));
}

export async function GET(request: NextRequest) {
  if (!(await authorized())) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const requestId = request.nextUrl.searchParams.get("requestId")?.trim();
  if (!requestId) return NextResponse.json({ error: "Brak requestId." }, { status: 400 });

  try {
    const run = await findRunByRequestId(requestId);
    if (!run) return NextResponse.json({ found: false });
    const artifacts = run.status === "completed" ? await getRunArtifacts(run.id) : [];
    return NextResponse.json({ found: true, run, artifacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się pobrać statusu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
