import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-10 w-full rounded-xl border border-[#dfe6ee] bg-white px-3 text-sm text-[#263541] outline-none transition placeholder:text-[#9aa6b1] hover:border-[#cfd8e3] focus:border-[#7f9bed] focus:ring-4 focus:ring-[#4f78e7]/10", props.className)} />;
}
