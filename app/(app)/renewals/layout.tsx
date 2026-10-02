import { requirePermission } from "@/lib/permissions";

export default async function PermissionLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("work.renewals" as any);
  return children;
}
