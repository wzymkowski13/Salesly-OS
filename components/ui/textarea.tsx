import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-24 w-full resize-y rounded-xl border border-[#dfe6ee] bg-white px-3 py-2.5 text-sm text-[#263541] outline-none transition placeholder:text-[#9aa6b1] hover:border-[#cfd8e3] focus:border-[#7f9bed] focus:ring-4 focus:ring-[#4f78e7]/10", props.className)} />;
}
