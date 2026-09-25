import { requireUser } from "@/lib/auth";
import { WalletCards } from "lucide-react";

export default async function FinancePage() {
  await requireUser();
  return <div className="rounded-[24px] border border-[#dfe6ee] bg-white p-8 shadow-[0_8px_30px_rgba(31,48,65,.04)]">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><WalletCards size={22}/></div>
    <h1 className="mt-5 text-2xl font-bold text-[#263640]">Finanse</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71808b]">Tu powstanie monitoring przychodów, kosztów, import bankowy, profil podatkowy i analityka miesiąc / kwartał / rok.</p>
  </div>;
}
