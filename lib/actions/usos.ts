"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsosConnectionWithSecrets, revokeUsosToken } from "@/lib/usos";
import { syncUsosForUser } from "@/lib/usos-sync";

function revalidateStudy() {
  revalidatePath("/private");
  revalidatePath("/private/study");
  revalidatePath("/private/calendar");
}

export async function syncUsosNow() {
  const { user } = await requirePermission("private.study");
  const summary = await syncUsosForUser(user.id);
  revalidateStudy();
  return {
    ok: true,
    message: "Synchronizacja USOS zakończona",
    description: `${summary.classes} zajęć · +${summary.classes_created} nowych · ${summary.classes_updated} zaktualizowanych · ${summary.classes_cancelled} odwołanych`,
  };
}

export async function disconnectUsos() {
  const { user } = await requirePermission("private.study");
  const connection = await getUsosConnectionWithSecrets(user.id);
  if (!connection) return;

  await revokeUsosToken(
    connection.provider,
    connection.access_token,
    connection.access_token_secret
  );

  const admin = createAdminClient();
  const { error } = await admin.from("usos_connections").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateStudy();
}
