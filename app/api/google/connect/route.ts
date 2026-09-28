import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthorizationUrl } from "@/lib/google";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = randomBytes(24).toString("hex");
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(buildGoogleAuthorizationUrl(origin, state));
  response.cookies.set("salesly_google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
