"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EXIT_MS = 180;

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
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "popover") return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, mode]);

  return <div ref={rootRef} className={cn("relative", mode === "inline" && "w-full")}>
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(current => !current)}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 rounded-xl font-semibold transition-all duration-150",
        compact ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "primary"
          ? "border border-[#4f84e7] bg-[#568deb] text-white shadow-[0_4px_12px_rgba(86,141,235,.18)] hover:-translate-y-px hover:bg-[#477ddd] hover:shadow-[0_7px_18px_rgba(86,141,235,.22)] active:scale-[.98]"
          : "border border-[#dbe3ec] bg-white text-[#31424e] shadow-[0_1px_2px_rgba(31,48,65,.04)] hover:border-[#cbd6e2] hover:bg-[#f8fafc] active:scale-[.98]"
      )}
    >
      <span className={cn("transition-transform duration-200", open && "rotate-90")}>
        {open ? <X size={16}/> : <Plus size={16}/>} 
      </span>
      {label}
    </button>

    {mounted && <div
      onSubmitCapture={(event) => {
        const form = event.target as HTMLFormElement;
        const optimisticKind = form.dataset.saleslyCreate;
        if (optimisticKind === "task" || optimisticKind === "event") {
          const values = Object.fromEntries(new FormData(form).entries());
          const optimisticId = `optimistic-${crypto.randomUUID()}`;
          window.dispatchEvent(new CustomEvent(`salesly:${optimisticKind}-optimistic-create`, {
            detail: { optimisticId, values },
          }));
        }

        // Nie czekamy z zamknięciem na round-trip do serwera. Sam submit już wystartował,
        // a panel znika płynnie od razu po kliknięciu "Dodaj/Zapisz".
        window.setTimeout(() => setOpen(false), 30);
      }}
      className={cn(
        "salesly-disclosure-panel z-30 mt-3 rounded-[18px] border border-[#dbe3ec] bg-white p-5 transition-[opacity,transform,box-shadow] duration-200 ease-out",
        mode === "popover" && "w-[min(760px,calc(100vw-2rem))] shadow-[0_20px_60px_rgba(31,48,65,.13)] lg:absolute",
        mode === "inline" && "w-full bg-[#fbfcfe] shadow-none",
        mode === "popover" && align === "right" ? "lg:right-0" : mode === "popover" ? "lg:left-0" : "",
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none -translate-y-1 scale-[.985] opacity-0"
      )}
    >{children}</div>}
  </div>;
}
