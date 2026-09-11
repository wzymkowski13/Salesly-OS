import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import { buildDispatchInputs, dispatchPfWorkflow, type LeadFactoryMode, type LeadFactorySource } from "@/lib/github/pf";

async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && isAllowedEmail(user.email) ? user : null;
}

export async function POST(request: Request) {
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });

  try {
    const body = await request.json() as {
      source?: LeadFactorySource;
      target?: number;
      mode?: LeadFactoryMode;
      includePublic?: boolean;
    };
    if (body.source !== "companies" && body.source !== "jdg") {
      return NextResponse.json({ error: "Nieprawidłowy profil kampanii." }, { status: 400 });
    }
    if (body.mode !== "fast" && body.mode !== "deep") {
      return NextResponse.json({ error: "Nieprawidłowy tryb kampanii." }, { status: 400 });
    }

    const requestId = `salesly-${crypto.randomUUID()}`;
    const inputs = buildDispatchInputs({
      source: body.source,
      target: Number(body.target),
      mode: body.mode,
      includePublic: Boolean(body.includePublic),
      requestId,
    });

    await dispatchPfWorkflow(inputs);
    return NextResponse.json({ requestId, inputs }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się uruchomić workflow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
