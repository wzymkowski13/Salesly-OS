import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  const variants = {
    primary: "bg-[#4f78e7] text-white shadow-sm shadow-blue-200 hover:bg-[#426dde] hover:shadow-md hover:shadow-blue-200/70",
    secondary: "border border-[#dfe6ee] bg-white text-[#2b3945] shadow-sm hover:border-[#cfd8e3] hover:bg-[#f8fafc]",
    soft: "border border-[#dce6ff] bg-[#eef3ff] text-[#3d67dc] hover:bg-[#e4ecff]",
    ghost: "text-[#5f6f7c] hover:bg-[#eef2f6] hover:text-[#25333e]",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    icon: "h-9 w-9 p-0",
  };
  return <button className={cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f78e7]/30",
    sizes[size], variants[variant], className
  )} {...props} />;
}
