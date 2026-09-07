import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormDisclosure({
  label,
  children,
  align = "left",
  compact = false,
  variant = "primary",
  mode = "popover",
}: {
  label: string;
  children: React.ReactNode;
  align?: "left"|"right";
  compact?: boolean;
  variant?: "primary"|"secondary";
  mode?: "popover"|"inline";
}) {
  return <details className={cn("group relative", mode === "inline" && "w-full")}>
    <summary className={cn(
      "inline-flex cursor-pointer select-none items-center gap-2 rounded-xl font-semibold transition-all duration-200",
      compact ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
      variant === "primary"
        ? "bg-[#4f78e7] text-white shadow-sm shadow-blue-200 hover:bg-[#426dde] hover:shadow-md"
        : "border border-[#dfe6ee] bg-white text-[#34434e] shadow-sm hover:bg-[#f8fafc]"
    )}>
      <Plus size={16} className="group-open:hidden"/>
      <X size={16} className="hidden group-open:block"/>
      {label}
    </summary>
    <div className={cn(
      "z-30 mt-3 rounded-[18px] border border-[#dfe6ee] bg-white p-5",
      mode === "popover" && "w-[min(760px,calc(100vw-2rem))] shadow-[0_18px_60px_rgba(31,48,65,.14)] lg:absolute",
      mode === "inline" && "w-full bg-[#fbfcfe] shadow-none",
      mode === "popover" && align === "right" ? "lg:right-0" : mode === "popover" ? "lg:left-0" : ""
    )}>{children}</div>
  </details>;
}
