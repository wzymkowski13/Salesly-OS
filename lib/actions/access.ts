"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_PERMISSION_KEYS, defaultRouteForPermissions, getUserAccess, permissionSetAllows } from "@/lib/permissions";

function cleanEmail(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLowerCase();
}

function requestedPermissions(formData: FormData) {
  const allowed = new Set<string>(ALL_PERMISSION_KEYS);
  return [...new Set(
    formData.getAll("permissions")
      .map(value => String(value))
      .filter(value => allowed.has(value))
  )];
}

async function requirePermissionsAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_permissions")
    .select("permission_key")
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  const permissions = new Set((data || []).map(row => String(row.permission_key)));
  if (!permissionSetAllows(permissions, "admin.permissions")) {
    throw new Error("Brak uprawnień administratora.");
  }
  return { user, permissions };
}

function revalidateAccessViews() {
  revalidatePath("/settings");
  revalidatePath("/settings/users");
  revalidatePath("/home");
}

export async function inviteAppUser(formData: FormData) {
  const { user } = await requirePermissionsAdmin();
  const admin = createAdminClient();
  const email = cleanEmail(formData.get("email"));
  const permissions = requestedPermissions(formData);

  if (!email || !email.includes("@")) throw new Error("Podaj poprawny adres e-mail.");
  if (!permissions.length) throw new Error("Nadaj co najmniej jedno uprawnienie.");

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id,email")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile) {
    throw new Error("Ten użytkownik ma już konto. Zmień jego uprawnienia na liście użytkowników.");
  }

  const { data: existingInvite } = await admin
    .from("access_invitations")
    .select("id")
    .ilike("email", email)
    .is("revoked_at", null)
    .maybeSingle();

  let error;
  if (existingInvite) {
    ({ error } = await admin
      .from("access_invitations")
      .update({
        permission_keys: permissions,
        invited_by: user.id,
        used_by: null,
        used_at: null,
      })
      .eq("id", existingInvite.id));
  } else {
    ({ error } = await admin
      .from("access_invitations")
      .insert({
        email,
        permission_keys: permissions,
        invited_by: user.id,
      }));
  }

  if (error) throw new Error(error.message);
  revalidateAccessViews();

  return {
    ok: true,
    message: existingInvite ? "Dostęp zaktualizowany" : "Dostęp przygotowany",
    description: `${email} może zalogować się przez Google. Uprawnienia zostaną nadane przy pierwszym logowaniu.`,
  };
}

export async function revokeAppInvitation(invitationId: string) {
  const { user } = await requirePermissionsAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("access_invitations")
    .update({ revoked_at: new Date().toISOString(), invited_by: user.id })
    .eq("id", invitationId);

  if (error) throw new Error(error.message);
  revalidateAccessViews();
  return { ok: true, message: "Zaproszenie wycofane" };
}

export async function setAppUserActive(targetUserId: string, active: boolean) {
  const { user } = await requirePermissionsAdmin();
  if (targetUserId === user.id && !active) {
    throw new Error("Nie możesz wyłączyć własnego konta administratora.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: active })
    .eq("id", targetUserId);

  if (error) throw new Error(error.message);
  revalidateAccessViews();
  return { ok: true, message: active ? "Użytkownik aktywowany" : "Użytkownik wyłączony" };
}

export async function replaceAppUserPermissions(targetUserId: string, formData: FormData) {
  const { user } = await requirePermissionsAdmin();
  const permissions = requestedPermissions(formData);

  if (targetUserId === user.id && !permissions.includes("admin.permissions")) {
    throw new Error("Nie możesz odebrać sobie uprawnień administratora.");
  }

  const admin = createAdminClient();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!targetProfile) throw new Error("Nie znaleziono użytkownika.");

  const { error: deleteError } = await admin
    .from("user_permissions")
    .delete()
    .eq("user_id", targetUserId);
  if (deleteError) throw new Error(deleteError.message);

  if (permissions.length) {
    const { error: insertError } = await admin
      .from("user_permissions")
      .insert(permissions.map(permission_key => ({
        user_id: targetUserId,
        permission_key,
        granted_by: user.id,
      })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidateAccessViews();
  return {
    ok: true,
    message: "Uprawnienia zapisane",
    description: `${permissions.length} aktywnych uprawnień.`,
  };
}

export async function completeOnboarding(formData: FormData) {
  const user = await requireUser();
  const admin = createAdminClient();
  const fullName = String(formData.get("full_name") || "").trim();
  const preferredWorkspace = String(formData.get("preferred_workspace") || "private");

  if (!fullName) throw new Error("Podaj imię i nazwisko.");
  if (!["work","private"].includes(preferredWorkspace)) throw new Error("Nieprawidłowy obszar startowy.");

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      preferred_workspace: preferredWorkspace,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  const access = await getUserAccess(user.id);
  if (!access.profile?.is_active) redirect("/access-pending");
  redirect(defaultRouteForPermissions(access.permissions, preferredWorkspace));
}
