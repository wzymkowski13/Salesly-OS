import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  const variants = {
    primary: "border border-[#4f84e7] bg-[#568deb] text-white shadow-[0_4px_12px_rgba(86,141,235,.18)] hover:-translate-y-px hover:bg-[#477ddd] hover:shadow-[0_7px_18px_rgba(86,141,235,.22)]",
    secondary: "border border-[#dbe3ec] bg-white text-[#31424e] shadow-[0_1px_2px_rgba(31,48,65,.04)] hover:border-[#cbd6e2] hover:bg-[#f8fafc]",
    soft: "border border-[#d7e4ff] bg-[#edf3ff] text-[#3e6fd4] hover:border-[#cbdcff] hover:bg-[#e4edff]",
    ghost: "text-[#60717e] hover:bg-[#edf2f7] hover:text-[#263641]",
    danger: "border border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-700",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    icon: "h-9 w-9 p-0",
  };

  return <button className={cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#568deb]/25",
    sizes[size], variants[variant], className
  )} {...props} />;
}
