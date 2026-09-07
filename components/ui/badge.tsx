import { cn } from "@/lib/utils";

export function Badge({ children, variant = "neutral", className }: { children: React.ReactNode; variant?: "neutral"|"green"|"amber"|"red"|"blue"; className?: string }) {
  const map = {
    neutral: "border border-[#e4e9ef] bg-[#f5f7f9] text-[#63717e]",
    green: "border border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border border-amber-100 bg-amber-50 text-amber-700",
    red: "border border-red-100 bg-red-50 text-red-700",
    blue: "border border-blue-100 bg-[#edf3ff] text-[#3e6fd4]",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none", map[variant], className)}>{children}</span>;
}
