"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, ChevronDown, Clock3, Database, Play, School, Settings2, UserRound } from "lucide-react";

const targetOptions = [100, 200, 300, 500];

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#e3e9ef] bg-white px-4 py-3 text-left transition hover:border-[#d4deea]"
    >
      <div>
        <div className="text-sm font-semibold text-[#34434e]">{label}</div>
        <div className="mt-0.5 text-xs text-[#84919c]">{description}</div>
      </div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#568deb]" : "bg-[#d7dee6]"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export function LeadFactoryWorkspace() {
  const [source, setSource] = useState<"companies" | "jdg">("companies");
  const [target, setTarget] = useState(200);
  const [mode, setMode] = useState<"fast" | "deep">("fast");
  const [includePublic, setIncludePublic] = useState(false);
  const [excludeCoops, setExcludeCoops] = useState(true);

  const summary = useMemo(() => {
    if (source === "jdg") return `${target} rekordów · CEIDG · ${mode === "fast" ? "szybki" : "głęboki"}`;
    return `${target} firm · ${mode === "fast" ? "fast" : "deep"} · oświata/urzędy ${includePublic ? "ON" : "OFF"}`;
  }, [source, target, mode, includePublic]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
      <section className="rounded-2xl border border-[#e1e7ee] bg-white shadow-[0_8px_30px_rgba(31,48,65,.035)]">
        <div className="border-b border-[#edf1f5] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><Settings2 size={18}/></div>
            <div>
              <h2 className="font-bold text-[#2a3944]">Nowa kampania</h2>
              <div className="text-xs text-[#83909b]">Parametry przyszłego uruchomienia GitHub Actions</div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#81909c]">Źródło</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setSource("companies")} className={`rounded-xl border p-4 text-left transition ${source === "companies" ? "border-[#bcd0f8] bg-[#f1f5ff]" : "border-[#e3e9ef] bg-white hover:bg-[#fafbfd]"}`}>
                <Building2 size={19} className={source === "companies" ? "text-[#568deb]" : "text-[#7c8a96]"}/>
                <div className="mt-2 text-sm font-bold text-[#34434e]">Firmy 10+</div>
                <div className="mt-1 text-xs text-[#84919c]">PF Scraper / baza-firm</div>
              </button>
              <button type="button" onClick={() => setSource("jdg")} className={`rounded-xl border p-4 text-left transition ${source === "jdg" ? "border-[#bcd0f8] bg-[#f1f5ff]" : "border-[#e3e9ef] bg-white hover:bg-[#fafbfd]"}`}>
                <UserRound size={19} className={source === "jdg" ? "text-[#568deb]" : "text-[#7c8a96]"}/>
                <div className="mt-2 text-sm font-bold text-[#34434e]">JDG</div>
                <div className="mt-1 text-xs text-[#84919c]">CEIDG</div>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#81909c]">Target</span>
              <div className="relative">
                <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className="h-11 w-full appearance-none rounded-xl border border-[#dfe6ed] bg-white px-3 pr-9 text-sm font-semibold text-[#34434e] outline-none transition focus:border-[#9fbaf1]">
                  {targetOptions.map((value) => <option key={value} value={value}>{value} rekordów</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-[#84919c]"/>
              </div>
            </label>
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#81909c]">Tryb</span>
              <div className="grid grid-cols-2 rounded-xl border border-[#dfe6ed] bg-[#f7f9fb] p-1">
                {(["fast", "deep"] as const).map((value) => <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${mode === value ? "bg-white text-[#436fcb] shadow-sm" : "text-[#7a8995]"}`}>{value === "fast" ? "Fast" : "Deep"}</button>)}
              </div>
            </div>
          </div>

          {source === "companies" && <div className="space-y-2">
            <Toggle checked={includePublic} onChange={setIncludePublic} label="Oświata i urzędy" description="Po włączeniu scraper może dołączyć ustalony udział placówek publicznych." />
            <Toggle checked={excludeCoops} onChange={setExcludeCoops} label="Wyklucz spółdzielnie" description="Pozostaw włączone dla standardowej paczki firm 10+." />
          </div>}

          <div className="rounded-xl border border-[#e4eaf1] bg-[#f8fafc] px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a98a4]">Podsumowanie</div>
            <div className="mt-1.5 text-sm font-semibold text-[#465864]">{summary}</div>
          </div>

          <button type="button" disabled className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#d9e1ea] px-4 text-sm font-bold text-[#7d8b96]">
            <Play size={16}/> Podłącz GitHub Actions, aby uruchomić
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-[#e1e7ee] bg-white p-5 shadow-[0_8px_30px_rgba(31,48,65,.035)]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 size={18}/></div>
            <div>
              <h2 className="font-bold text-[#2a3944]">Stan integracji</h2>
              <div className="text-xs text-[#83909b]">Co jest gotowe, a czego jeszcze brakuje</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2.5"><span className="text-[#5d6f7c]">Panel kampanii</span><span className="font-bold text-emerald-600">Gotowy</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2.5"><span className="text-[#5d6f7c]">Parametry runu</span><span className="font-bold text-emerald-600">Gotowe</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2.5"><span className="text-[#5d6f7c]">GitHub workflow dispatch</span><span className="font-bold text-amber-600">Do podpięcia</span></div>
            <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2.5"><span className="text-[#5d6f7c]">Status i artefakty</span><span className="font-bold text-amber-600">Do podpięcia</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e1e7ee] bg-white p-5 shadow-[0_8px_30px_rgba(31,48,65,.035)]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f0f3f6] p-2 text-[#657580]"><Clock3 size={18}/></div>
            <div>
              <h2 className="font-bold text-[#2a3944]">Ostatnie kampanie</h2>
              <div className="text-xs text-[#83909b]">Historia pojawi się po spięciu GitHub Actions</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-[#dbe3eb] bg-[#fafbfd] px-4 py-8 text-center">
            <Database size={22} className="mx-auto text-[#a5b0b9]"/>
            <div className="mt-2 text-sm font-semibold text-[#667783]">Brak zsynchronizowanych runów</div>
            <div className="mt-1 text-xs text-[#94a0aa]">Tu pokażemy status, wynik i link do paczki CSV.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
