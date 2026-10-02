import { requirePermission } from "@/lib/permissions";

export default async function PermissionLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("private.calendar" as any);
  return children;
}
