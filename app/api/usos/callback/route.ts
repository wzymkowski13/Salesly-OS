import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeUsosAccessToken,
  unsealUsosOauthState,
  usosGetJson,
} from "@/lib/usos";
import { syncUsosForUser } from "@/lib/usos-sync";
import { getUserAccess, permissionSetAllows } from "@/lib/permissions";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const verifier = url.searchParams.get("oauth_verifier");
  const state = unsealUsosOauthState(request.cookies.get("salesly_usos_oauth")?.value);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !state || state.userId !== user.id || !oauthToken || !verifier || oauthToken !== state.requestToken) {
    return NextResponse.redirect(new URL("/private/study?usos=callback_error", url.origin));
  }

  const accessState = await getUserAccess(user.id);
  if (!accessState.profile?.is_active || !permissionSetAllows(accessState.permissions, "private.study")) {
    return NextResponse.redirect(new URL("/access-denied?permission=private.study", url.origin));
  }

  try {
    const access = await exchangeUsosAccessToken(
      state.provider,
      state.requestToken,
      state.requestTokenSecret,
      verifier
    );

    let externalUserId: string | null = null;
    let externalUserName: string | null = null;
    try {
      const profile = await usosGetJson<any>(
        state.provider,
        "/services/users/user",
        access.token,
        access.secret,
        { fields: "id|first_name|last_name" }
      );
      externalUserId = profile?.id ? String(profile.id) : null;
      externalUserName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;
    } catch {}

    const admin = createAdminClient();
    const { error } = await admin.from("usos_connections").upsert({
      user_id: user.id,
      provider: state.provider,
      access_token: access.token,
      access_token_secret: access.secret,
      scopes: ["studies", "offline_access"],
      external_user_id: externalUserId,
      external_user_name: externalUserName,
      connected_at: new Date().toISOString(),
      last_sync_status: "pending",
    });
    if (error) throw error;

    let syncResult = "connected";
    try {
      await syncUsosForUser(user.id);
      syncResult = "synced";
    } catch {
      syncResult = "sync_error";
    }

    const response = NextResponse.redirect(
      new URL(`/private/study?usos=${syncResult}&provider=${state.provider}`, url.origin)
    );
    response.cookies.delete("salesly_usos_oauth");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/private/study?usos=callback_error", url.origin));
  }
}
