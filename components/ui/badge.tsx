import { cn } from "@/lib/utils";

export function Badge({ children, variant = "neutral", className }: { children: React.ReactNode; variant?: "neutral"|"green"|"amber"|"red"|"blue"; className?: string }) {
  const map = {
    neutral: "bg-zinc-100 text-zinc-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", map[variant], className)}>{children}</span>;
}
