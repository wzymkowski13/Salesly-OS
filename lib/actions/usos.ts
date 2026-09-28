"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsosConnectionWithSecrets, revokeUsosToken } from "@/lib/usos";
import { syncUsosForUser } from "@/lib/usos-sync";

function revalidateStudy() {
  revalidatePath("/private");
  revalidatePath("/private/study");
  revalidatePath("/private/calendar");
}

export async function syncUsosNow() {
  const user = await requireUser();
  await syncUsosForUser(user.id);
  revalidateStudy();
}

export async function disconnectUsos() {
  const user = await requireUser();
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
