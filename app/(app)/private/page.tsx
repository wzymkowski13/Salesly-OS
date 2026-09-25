import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, CheckSquare2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PrivateDashboardPage() {
  await requireUser();

  return <div className="space-y-7">
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b99a4]">Prywatne</div>
      <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-[#263640]">Dashboard</h1>
    </div>

    <div className="grid gap-5 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2 text-violet-600"><BookOpenCheck size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe zajęcia</h2><div className="text-xs text-[#83909b]">Studia</div></div></div>
          <Link href="/private/study" className="text-sm font-semibold text-[#5f79ad]">Studia <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent><EmptyState title="Moduł w przygotowaniu" description="Plan zajęć pojawi się tutaj po wdrożeniu modułu Studia."/></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><CalendarDays size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Najbliższe zaliczenia</h2><div className="text-xs text-[#83909b]">Terminy</div></div></div>
        </CardHeader>
        <CardContent><EmptyState title="Brak danych" description="Zaliczenia będą liczone z przedmiotów i planu studiów."/></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><CheckSquare2 size={18}/></div><div><h2 className="font-bold text-[#2a3944]">Zadania prywatne</h2><div className="text-xs text-[#83909b]">Prywatne + studia</div></div></div>
          <Link href="/private/tasks" className="text-sm font-semibold text-[#5f79ad]">Zadania <ArrowRight size={15} className="inline"/></Link>
        </CardHeader>
        <CardContent><EmptyState title="Widok scope w przygotowaniu" description="W foundation powstaje wspólny silnik zadań filtrowany po środowisku."/></CardContent>
      </Card>
    </div>
  </div>;
}
