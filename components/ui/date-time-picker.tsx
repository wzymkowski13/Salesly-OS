"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";

export function DateTimePicker({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const parsed = useMemo(() => {
    if (!defaultValue) return { date: "", time: "09:00" };
    const value = defaultValue.slice(0, 16);
    return { date: value.slice(0, 10), time: value.slice(11, 16) || "09:00" };
  }, [defaultValue]);
  const [date, setDate] = useState(parsed.date);
  const [time, setTime] = useState(parsed.time);
  return <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr]">
    <Input type="date" value={date} onChange={(event)=>setDate(event.target.value)}/>
    {date ? <TimePicker defaultValue={parsed.time} onValueChange={setTime}/> : <div className="flex h-10 items-center rounded-xl border border-dashed border-[#dfe6ee] px-3 text-xs text-[#96a2ac]">Najpierw wybierz datę</div>}
    <input type="hidden" name={name} value={date ? `${date}T${time}` : ""}/>
  </div>;
}
