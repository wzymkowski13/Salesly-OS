import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import { getArtifactRedirect } from "@/lib/github/pf";

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user && isAllowedEmail(user.email));
}

export async function GET(request: NextRequest) {
  if (!(await authorized())) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const artifactId = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(artifactId) || artifactId < 1) {
    return NextResponse.json({ error: "Nieprawidłowy artifact id." }, { status: 400 });
  }

  try {
    const location = await getArtifactRedirect(artifactId);
    return NextResponse.redirect(location);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się pobrać artefaktu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
