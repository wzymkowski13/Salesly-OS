"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } });
    if (error) { setError(error.message); setLoading(false); }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#23313c] px-6 py-10">
    <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#4f78e7]/20 blur-3xl"/>
    <div className="absolute -bottom-40 -right-24 h-[480px] w-[480px] rounded-full bg-[#6d8fe9]/10 blur-3xl"/>
    <div className="relative w-full max-w-[430px] rounded-[26px] border border-white/10 bg-white p-8 shadow-[0_28px_80px_rgba(10,22,32,.32)] sm:p-9">
      <div className="mb-8">
        <img src="/salesly-logo.png" alt="Salesly OS" className="h-12 w-auto"/>
        <h1 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#25343f]">Centrum operacyjne</h1>
        <p className="mt-2 text-sm text-[#6c7c87]">Zaloguj się do Salesly OS</p>
      </div>
      <Button className="w-full" onClick={login} disabled={loading}>{loading ? "Łączenie…" : <>Zaloguj przez Google <ArrowRight size={16}/></>}</Button>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-6 text-center text-xs text-[#929da6]">Dostęp dla zatwierdzonych kont Salesly</div>
    </div>
  </main>;
}
