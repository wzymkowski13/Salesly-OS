import Link from "next/link";
import { ShieldX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
        <div className="mt-6"><Button asChild><Link href="/home">Wróć do centrum</Link></Button></div>
      </CardContent>
    </Card>
  </main>;
}
