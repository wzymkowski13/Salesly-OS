import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";
import { ALL_PERMISSION_KEYS, defaultRouteForPermissions } from "@/lib/permissions";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  const email = user.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id,email,full_name,is_active,onboarding_completed_at,preferred_workspace,created_at")
    .eq("id", user.id)
    .maybeSingle();

  let invitation: any = null;
  let invitationTableAvailable = true;
  if (!existingProfile) {
    const invitationResult = await admin
      .from("access_invitations")
      .select("id,email,permission_keys,revoked_at,used_at,used_by,invited_by")
      .ilike("email", email)
      .is("revoked_at", null)
      .maybeSingle();

    if (invitationResult.error) invitationTableAvailable = false;
    else invitation = invitationResult.data;
  }

  const allowlisted = isAllowedEmail(email);
  if (!existingProfile && !allowlisted && !invitation) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  if (!existingProfile) {
    const { count: profileCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const isFirstUser = (profileCount || 0) === 0;
    const profilePayload: Record<string, unknown> = {
      id: user.id,
      email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || email,
      avatar_url: user.user_metadata?.avatar_url || null,
      is_active: true,
    };

    const { error: profileError } = await admin.from("profiles").upsert(profilePayload);
    if (profileError) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=profile`);
    }

    const permissionKeys = isFirstUser
      ? [...ALL_PERMISSION_KEYS]
      : invitation?.permission_keys?.length
        ? invitation.permission_keys
        : allowlisted
          ? ["private.dashboard", "private.tasks", "private.calendar"]
          : [];

    if (permissionKeys.length) {
      const rows = [...new Set(permissionKeys)].map(permission_key => ({
        user_id: user.id,
        permission_key,
        granted_by: invitation?.invited_by || user.id,
      }));

      const { error: permissionError } = await admin
        .from("user_permissions")
        .upsert(rows, { onConflict: "user_id,permission_key" });

      if (permissionError) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=permissions`);
      }
    }

    if (invitation && invitationTableAvailable) {
      await admin
        .from("access_invitations")
        .update({
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);
    }

    return NextResponse.redirect(`${origin}/onboarding`);
  }

  if (!existingProfile.is_active) {
    return NextResponse.redirect(`${origin}/access-pending`);
  }

  if (!existingProfile.onboarding_completed_at) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  const { data: permissionRows } = await admin
    .from("user_permissions")
    .select("permission_key")
    .eq("user_id", user.id);
  const permissions = new Set((permissionRows || []).map(row => String(row.permission_key)));
  const preferred = defaultRouteForPermissions(permissions, existingProfile.preferred_workspace);
  return NextResponse.redirect(`${origin}${preferred}`);
}
