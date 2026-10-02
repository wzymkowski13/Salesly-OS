import Link from "next/link";
import { ShieldX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<{ permission?: string }> }) {
  await requireUser();
  const params = await searchParams;

  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10">
    <Card className="w-full max-w-[560px]">
      <CardContent className="p-7 text-center sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><ShieldX size={24}/></div>
        <h1 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#2b3b46]">Brak dostępu do tego modułu</h1>
        <p className="mt-3 text-sm leading-6 text-[#74838f]">Ten obszar nie jest w Twoim aktualnym zakresie uprawnień. Administrator może zmienić dostęp w Ustawieniach.</p>
        {params.permission && <div className="mt-4 text-xs text-[#9aa5ae]">Wymagane: <span className="font-mono">{params.permission}</span></div>}
        <div className="mt-6"><Link href="/home" className="inline-flex h-10 items-center justify-center rounded-xl border border-[#4f84e7] bg-[#568deb] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(86,141,235,.18)] transition hover:-translate-y-px hover:bg-[#477ddd]">Wróć do centrum</Link></div>
      </CardContent>
    </Card>
  </main>;
}
