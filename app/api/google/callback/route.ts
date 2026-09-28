import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeGoogleCode } from "@/lib/google";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get("salesly_google_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?google=error", origin));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  try {
    const tokens = await exchangeGoogleCode(code, origin);
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("google_integrations")
      .select("refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();

    let connectedEmail: string | null = null;
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      connectedEmail = userInfo.email || null;
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
    const { error } = await admin.from("google_integrations").upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existing?.refresh_token || null,
      expires_at: expiresAt,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      connected_email: connectedEmail,
      calendar_id: "primary",
    });

    if (error) throw error;

    const response = NextResponse.redirect(new URL("/settings?google=connected", origin));
    response.cookies.delete("salesly_google_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/settings?google=error", origin));
  }
}
