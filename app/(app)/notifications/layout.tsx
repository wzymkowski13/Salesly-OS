import { requirePermission } from "@/lib/permissions";

export default async function PermissionLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("work.notifications" as any);
  return children;
}
