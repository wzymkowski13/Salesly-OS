"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

function normalize(value?: string | null) {
  if (!value) return { hour: "09", minute: "00" };
  const [rawHour = "09", rawMinute = "00"] = value.slice(0, 5).split(":");
  const hour = String(Math.min(23, Math.max(0, Number(rawHour) || 0))).padStart(2, "0");
  const minute = String(Math.min(59, Math.max(0, Number(rawMinute) || 0))).padStart(2, "0");
  return { hour, minute };
}

export function TimePicker({
  name,
  defaultValue,
  required = false,
  optional = false,
  minuteStep = 5,
  className,
  onValueChange,
}: {
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
  optional?: boolean;
  minuteStep?: number;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const initial = useMemo(() => normalize(defaultValue), [defaultValue]);
  const [enabled, setEnabled] = useState(!optional || Boolean(defaultValue));
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  useEffect(() => {
    const next = normalize(defaultValue);
    setHour(next.hour);
    setMinute(next.minute);
    setEnabled(!optional || Boolean(defaultValue));
  }, [defaultValue, optional]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")), []);
  const minutes = useMemo(() => {
    const values = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, index) => String(index * minuteStep).padStart(2, "0"));
    if (!values.includes(minute)) values.push(minute);
    return values.sort((a, b) => Number(a) - Number(b));
  }, [minute, minuteStep]);

  const value = enabled ? `${hour}:${minute}` : "";
  useEffect(() => { onValueChange?.(value); }, [value, onValueChange]);

  if (optional && !enabled) {
    return <div className={className}>
      {name && <input type="hidden" name={name} value=""/>}
      <button
        type="button"
        onClick={() => setEnabled(true)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfd9e4] bg-[#fbfcfe] px-3 text-sm font-semibold text-[#6d7d89] transition-all hover:border-[#9eb8e8] hover:bg-[#f5f9ff] hover:text-[#416fc9] active:scale-[.99]"
      >
        <Plus size={15}/> Dodaj godzinę
      </button>
    </div>;
  }

  return <div className={cn("space-y-2", className)}>
    {name && <input type="hidden" name={name} value={value} required={required}/>} 

    <div className="flex items-center gap-2">
      <div className="grid h-10 min-w-0 flex-1 grid-cols-[28px_minmax(58px,1fr)_10px_minmax(58px,1fr)] items-center rounded-xl border border-[#dfe6ee] bg-white px-2 shadow-[0_1px_2px_rgba(31,48,65,.025)] transition focus-within:border-[#7f9bed] focus-within:ring-4 focus-within:ring-[#4f78e7]/10">
        <Clock3 size={15} className="text-[#83929d]"/>
        <select
          aria-label="Godzina"
          value={hour}
          onChange={event => setHour(event.target.value)}
          className="h-9 min-w-0 appearance-none bg-transparent px-1 text-center text-sm font-bold tabular-nums text-[#2d3c47] outline-none"
        >
          {hours.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <span className="text-center font-bold text-[#7c8b96]">:</span>
        <select
          aria-label="Minuty"
          value={minute}
          onChange={event => setMinute(event.target.value)}
          className="h-9 min-w-0 appearance-none bg-transparent px-1 text-center text-sm font-bold tabular-nums text-[#2d3c47] outline-none"
        >
          {minutes.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {optional && <button
        type="button"
        aria-label="Usuń godzinę"
        onClick={() => setEnabled(false)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#dfe6ee] bg-white text-[#7c8b96] transition hover:border-[#d2dce6] hover:bg-[#f6f8fa] hover:text-[#445560] active:scale-95"
      ><X size={15}/></button>}
    </div>

    <div className="flex items-center justify-between gap-3">
      <div className="text-[11px] font-semibold text-[#8997a2]">Wybrano <span className="font-bold tabular-nums text-[#4b5d69]">{value}</span></div>
      <div className="flex gap-1">
        {["00","15","30","45"].map(item => <button
          key={item}
          type="button"
          onClick={() => setMinute(item)}
          className={cn(
            "rounded-lg px-2 py-1 text-[10px] font-bold transition active:scale-95",
            minute === item ? "bg-[#e9f1ff] text-[#3f6fd0]" : "bg-[#f3f6f8] text-[#7a8994] hover:bg-[#edf1f5]"
          )}
        >:{item}</button>)}
      </div>
    </div>
  </div>;
}
