import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type PermissionKey =
  | "admin.permissions"
  | "work.dashboard"
  | "work.crm"
  | "work.renewals"
  | "work.tasks"
  | "work.calendar"
  | "work.notifications"
  | "leadfactory.access"
  | "private.dashboard"
  | "private.tasks"
  | "private.calendar"
  | "private.study"
  | "private.finance"
  | "private.documents"
  | "settings.integrations"
  | "external.callcenter"
  | "external.salesmetrics";

export const PERMISSION_GROUPS = [
  {
    key: "work",
    label: "Służbowe",
    permissions: [
      ["work.dashboard", "Dashboard"],
      ["work.crm", "CRM"],
      ["work.renewals", "Odnowienia"],
      ["work.tasks", "Zadania"],
      ["work.calendar", "Kalendarz"],
      ["work.notifications", "Powiadomienia"],
    ],
  },
  {
    key: "private",
    label: "Prywatne",
    permissions: [
      ["private.dashboard", "Dashboard"],
      ["private.tasks", "Zadania"],
      ["private.calendar", "Kalendarz"],
      ["private.study", "Studia"],
      ["private.finance", "Finanse"],
      ["private.documents", "Dokumenty"],
    ],
  },
  {
    key: "tools",
    label: "Narzędzia",
    permissions: [
      ["leadfactory.access", "LeadFactory"],
      ["external.callcenter", "Call Center Panel"],
      ["external.salesmetrics", "SalesMetrics"],
      ["settings.integrations", "Integracje"],
    ],
  },
  {
    key: "admin",
    label: "Administracja",
    permissions: [
      ["admin.permissions", "Użytkownicy i uprawnienia"],
    ],
  },
] as const;

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(group =>
  group.permissions.map(([key]) => key)
) as PermissionKey[];

function namespaceWildcard(permission: string) {
  const [namespace] = permission.split(".");
  return namespace ? `${namespace}.*` : null;
}

export function permissionSetAllows(permissionSet: Set<string>, permission: string) {
  if (permissionSet.has("*") || permissionSet.has("admin.permissions")) return true;
  if (permissionSet.has(permission)) return true;
  const wildcard = namespaceWildcard(permission);
  return wildcard ? permissionSet.has(wildcard) : false;
}

export function hasAnyPermission(permissionSet: Set<string>, permissions: string[]) {
  return permissions.some(permission => permissionSetAllows(permissionSet, permission));
}

export function defaultRouteForPermissions(permissionSet: Set<string>, preferredWorkspace?: string | null) {
  const workRoutes: Array<[string,string]> = [
    ["/dashboard","work.dashboard"],
    ["/crm","work.crm"],
    ["/tasks","work.tasks"],
    ["/calendar","work.calendar"],
    ["/renewals","work.renewals"],
    ["/notifications","work.notifications"],
  ];
  const privateRoutes: Array<[string,string]> = [
    ["/private","private.dashboard"],
    ["/private/study","private.study"],
    ["/private/finance","private.finance"],
    ["/private/tasks","private.tasks"],
    ["/private/calendar","private.calendar"],
    ["/private/documents","private.documents"],
  ];

  const firstAllowed = (routes: Array<[string,string]>) =>
    routes.find(([,permission]) => permissionSetAllows(permissionSet, permission))?.[0] || null;

  if (preferredWorkspace === "work") {
    return firstAllowed(workRoutes) || firstAllowed(privateRoutes) || (permissionSetAllows(permissionSet, "leadfactory.access") ? "/lead-factory" : "/home");
  }

  if (preferredWorkspace === "private") {
    return firstAllowed(privateRoutes) || firstAllowed(workRoutes) || (permissionSetAllows(permissionSet, "leadfactory.access") ? "/lead-factory" : "/home");
  }

  return firstAllowed(privateRoutes)
    || firstAllowed(workRoutes)
    || (permissionSetAllows(permissionSet, "leadfactory.access") ? "/lead-factory" : "/home");
}

export async function getUserAccess(userId?: string) {
  const user = userId ? { id: userId } : await requireUser();
  const admin = createAdminClient();

  const profileResult = await admin
    .from("profiles")
    .select("id,email,full_name,is_active,onboarding_completed_at,preferred_workspace,created_at")
    .eq("id", user.id)
    .maybeSingle();

  let profile = profileResult.data as any;
  if (profileResult.error) {
    const legacyProfile = await admin
      .from("profiles")
      .select("id,email,full_name,is_active,created_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = legacyProfile.data
      ? {
          ...legacyProfile.data,
          onboarding_completed_at: legacyProfile.data.created_at,
          preferred_workspace: null,
        }
      : null;
  }

  const { data: permissionRows } = await admin
    .from("user_permissions")
    .select("permission_key")
    .eq("user_id", user.id);

  const permissions = new Set((permissionRows || []).map(row => String(row.permission_key)));
  return {
    profile,
    permissions,
    isAdmin: permissionSetAllows(permissions, "admin.permissions"),
  };
}

export async function requireActiveUser() {
  const user = await requireUser();
  const access = await getUserAccess(user.id);

  if (!access.profile?.is_active) redirect("/access-pending");
  return { user, ...access };
}

export async function requirePermission(permission: PermissionKey) {
  const access = await requireActiveUser();
  if (!permissionSetAllows(access.permissions, permission)) {
    redirect(`/access-denied?permission=${encodeURIComponent(permission)}`);
  }
  return access;
}

export async function requireAnyPermission(permissions: PermissionKey[]) {
  const access = await requireActiveUser();
  if (!hasAnyPermission(access.permissions, permissions)) {
    redirect(`/access-denied?permission=${encodeURIComponent(permissions.join(" | "))}`);
  }
  return access;
}
