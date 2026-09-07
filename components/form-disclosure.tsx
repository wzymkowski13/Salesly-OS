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
      "inline-flex cursor-pointer select-none items-center gap-2 rounded-xl font-semibold transition-all duration-150",
      compact ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
      variant === "primary"
        ? "border border-[#4f84e7] bg-[#568deb] text-white shadow-[0_4px_12px_rgba(86,141,235,.18)] hover:-translate-y-px hover:bg-[#477ddd] hover:shadow-[0_7px_18px_rgba(86,141,235,.22)]"
        : "border border-[#dbe3ec] bg-white text-[#31424e] shadow-[0_1px_2px_rgba(31,48,65,.04)] hover:border-[#cbd6e2] hover:bg-[#f8fafc]"
    )}>
      <Plus size={16} className="group-open:hidden"/>
      <X size={16} className="hidden group-open:block"/>
      {label}
    </summary>
    <div className={cn(
      "salesly-disclosure-panel z-30 mt-3 rounded-[18px] border border-[#dbe3ec] bg-white p-5",
      mode === "popover" && "w-[min(760px,calc(100vw-2rem))] shadow-[0_20px_60px_rgba(31,48,65,.13)] lg:absolute",
      mode === "inline" && "w-full bg-[#fbfcfe] shadow-none",
      mode === "popover" && align === "right" ? "lg:right-0" : mode === "popover" ? "lg:left-0" : ""
    )}>{children}</div>
  </details>;
}
