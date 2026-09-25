import { requireUser } from "@/lib/auth";
import { BookOpenCheck } from "lucide-react";

export default async function StudyPage() {
  await requireUser();
  return <div className="rounded-[24px] border border-[#dfe6ee] bg-white p-8 shadow-[0_8px_30px_rgba(31,48,65,.04)]">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><BookOpenCheck size={22}/></div>
    <h1 className="mt-5 text-2xl font-bold text-[#263640]">Studia</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71808b]">Tu powstaną plan zajęć, przedmioty, frekwencja, zaliczenia, ECTS, oceny i notatki Google Docs.</p>
  </div>;
}
