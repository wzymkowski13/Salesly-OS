"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
  duration: number;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(toast.duration);
  const startedAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(onDismiss, remaining);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const elapsed = Date.now() - startedAt.current;
      setRemaining(current => Math.max(0, current - elapsed));
    };
  }, [paused, remaining, onDismiss]);

  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? CircleAlert : Info;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white shadow-[0_18px_48px_rgba(31,48,65,.16)]",
        toast.tone === "success" && "border-emerald-200",
        toast.tone === "error" && "border-red-200",
        toast.tone === "info" && "border-[#dbe3ec]"
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3.5 pr-11">
        <div className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          toast.tone === "success" && "bg-emerald-50 text-emerald-600",
          toast.tone === "error" && "bg-red-50 text-red-600",
          toast.tone === "info" && "bg-[#edf3ff] text-[#568deb]"
        )}><Icon size={17}/></div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#2f404b]">{toast.title}</div>
          {toast.description && <div className="mt-0.5 text-xs leading-5 text-[#75848f]">{toast.description}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Zamknij powiadomienie"
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-xl text-[#84919c] transition hover:bg-[#f2f5f8] hover:text-[#40515d]"
      >
        <X size={15}/>
      </button>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[#edf1f5]">
        <div
          key={paused ? "paused" : "running"}
          className={cn(
            "h-full origin-left",
            toast.tone === "success" && "bg-emerald-500",
            toast.tone === "error" && "bg-red-500",
            toast.tone === "info" && "bg-[#568deb]"
          )}
          style={{
            width: paused ? String(Math.max(0, Math.min(100, (remaining / toast.duration) * 100))) + "%" : "0%",
            transition: paused ? "none" : "width " + remaining + "ms linear",
          }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(current => current.filter(item => item.id !== id));
  }, []);

  const pushToast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    const toast: ToastItem = {
      ...input,
      id,
      tone: input.tone || "success",
      duration: input.duration ?? 4200,
    };
    setToasts(current => [...current.slice(-3), toast]);
    return id;
  }, []);

  const value = useMemo(() => ({ pushToast, dismissToast }), [pushToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-[90px] z-[120] flex w-[min(390px,calc(100vw-2rem))] flex-col gap-3 sm:right-6">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastCard toast={toast} onDismiss={() => dismissToast(toast.id)}/>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
