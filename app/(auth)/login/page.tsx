"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
      <div className="mb-8">
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-bold text-white">SO</div>
        <h1 className="text-3xl font-semibold tracking-tight">Salesly OS</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Prywatne centrum operacyjne. Dostęp wyłącznie dla zatwierdzonych kont.</p>
      </div>
      <Button className="w-full" onClick={login} disabled={loading}>{loading ? "Łączenie…" : "Zaloguj przez Google"}</Button>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  </main>;
}
