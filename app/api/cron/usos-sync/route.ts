import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUsosForUser } from "@/lib/usos-sync";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("usos_connections")
    .select("user_id")
    .order("connected_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let success = 0;
  let failed = 0;
  const users = connections || [];

  for (let i = 0; i < users.length; i += 2) {
    const batch = users.slice(i, i + 2);
    const results = await Promise.allSettled(batch.map(row => syncUsosForUser(row.user_id)));
    results.forEach(result => {
      if (result.status === "fulfilled") success += 1;
      else failed += 1;
    });
  }

  return NextResponse.json({ ok: true, total: users.length, success, failed });
}
