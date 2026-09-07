"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function normalize(value?: string) {
  if (!value) return { hour: "09", minute: "00" };
  const [rawHour = "09", rawMinute = "00"] = value.slice(0, 5).split(":");
  const hour = String(Math.min(23, Math.max(0, Number(rawHour) || 0))).padStart(2, "0");
  const minuteNumber = Math.min(59, Math.max(0, Number(rawMinute) || 0));
  return { hour, minute: String(minuteNumber).padStart(2, "0") };
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
  const initial = useMemo(() => normalize(defaultValue || undefined), [defaultValue]);
  const [enabled, setEnabled] = useState(!optional || Boolean(defaultValue));
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, index) => String(index * minuteStep).padStart(2, "0"));
  if (!minutes.includes(minute)) minutes.push(minute);
  minutes.sort((a, b) => Number(a) - Number(b));
  const value = enabled ? `${hour}:${minute}` : "";
  useEffect(() => { onValueChange?.(value); }, [value, onValueChange]);

  return <div className={cn("space-y-2", className)}>
    {name && <input type="hidden" name={name} value={value} required={required}/>} 
    <div className="flex items-center gap-2">
      <div className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#dfe6ee] bg-white px-2.5 transition focus-within:border-[#7f9bed] focus-within:ring-4 focus-within:ring-[#4f78e7]/10", !enabled && "opacity-50")}>
        <Clock3 size={15} className="shrink-0 text-[#83929d]"/>
        <Select aria-label="Godzina" value={hour} onChange={(event)=>setHour(event.target.value)} disabled={!enabled} className="h-10 flex-1 border-0 px-1 shadow-none focus:ring-0">
          {hours.map(item=><option key={item} value={item}>{item}</option>)}
        </Select>
        <span className="font-bold text-[#7c8b96]">:</span>
        <Select aria-label="Minuty" value={minute} onChange={(event)=>setMinute(event.target.value)} disabled={!enabled} className="h-10 flex-1 border-0 px-1 shadow-none focus:ring-0">
          {minutes.map(item=><option key={item} value={item}>{item}</option>)}
        </Select>
      </div>
      {optional && <button type="button" onClick={()=>setEnabled((current)=>!current)} className="h-10 rounded-xl border border-[#dfe6ee] bg-white px-3 text-xs font-semibold text-[#657580] transition hover:bg-[#f7f9fb] active:scale-[.98]">{enabled ? "Usuń" : "Dodaj"}</button>}
    </div>
    {enabled && <div className="flex flex-wrap gap-1.5">
      {["00","15","30","45"].map(item=><button key={item} type="button" onClick={()=>setMinute(item)} className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold transition active:scale-95", minute===item ? "bg-[#e9f1ff] text-[#3f6fd0]" : "bg-[#f3f6f8] text-[#7a8994] hover:bg-[#edf1f5]")}>:{item}</button>)}
    </div>}
  </div>;
}
