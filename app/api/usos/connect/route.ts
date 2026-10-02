import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAccess, permissionSetAllows } from "@/lib/permissions";
import {
  createUsosRequestToken,
  isUsosProvider,
  sealUsosOauthState,
  usosAuthorizeUrl,
  usosCallbackUrl,
} from "@/lib/usos";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const access = await getUserAccess(user.id);
  if (!access.profile?.is_active || !permissionSetAllows(access.permissions, "private.study")) {
    return NextResponse.redirect(new URL("/access-denied?permission=private.study", request.url));
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  if (!isUsosProvider(provider)) {
    return NextResponse.redirect(new URL("/private/study?usos=invalid_provider", request.url));
  }

  try {
    const callback = usosCallbackUrl(url.origin);
    const requestToken = await createUsosRequestToken(provider, callback);
    const state = sealUsosOauthState({
      provider,
      requestToken: requestToken.token,
      requestTokenSecret: requestToken.secret,
      userId: user.id,
      expiresAt: Date.now() + 20 * 60 * 1000,
    });

    const response = NextResponse.redirect(usosAuthorizeUrl(provider, requestToken.token));
    response.cookies.set("salesly_usos_oauth", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 20 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL(`/private/study?usos=connect_error&provider=${provider}`, request.url));
  }
}
