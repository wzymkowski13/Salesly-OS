"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Zamknij" onClick={onClose} className="salesly-modal-backdrop absolute inset-0 bg-[#152433]/35 backdrop-blur-[3px]" />
      <div className={cn("salesly-modal-panel relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] border border-[#dfe6ee] bg-white shadow-[0_28px_90px_rgba(29,43,56,.22)] sm:max-w-2xl sm:rounded-[24px]", className)}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#edf1f5] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            {eyebrow && <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a99a5]">{eyebrow}</div>}
            <h2 className="text-lg font-bold text-[#25343f]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#7c8b96] transition-all hover:bg-[#f2f5f8] hover:text-[#334550] active:scale-95">
            <X size={18}/>
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
