"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  ExternalLink,
  Loader2,
  Play,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type Artifact = { id: number; name: string; expired: boolean; size_in_bytes: number };
type Run = {
  id: number;
  run_number: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
  display_title?: string;
  name?: string;
  artifacts?: Artifact[];
};

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

function runLabel(run: Run) {
  if (run.status !== "completed") return run.status === "queued" ? "W kolejce" : "W toku";
  if (run.conclusion === "success") return "Zakończony";
  if (run.conclusion === "cancelled") return "Anulowany";
  return "Błąd";
}

export function LeadFactoryWorkspace() {
  const [source, setSource] = useState<"companies" | "jdg">("companies");
  const [target, setTarget] = useState(200);
  const [mode, setMode] = useState<"fast" | "deep">("fast");
  const [includePublic, setIncludePublic] = useState(false);
  const [resetSources, setResetSources] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [currentArtifacts, setCurrentArtifacts] = useState<Artifact[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const region = source === "companies" ? "Śląskie" : "Częstochowa + okolice";
  const validTarget = Number.isInteger(target) && target >= 1 && target <= 500;
  const summary = useMemo(() => {
    const sourcePosition = resetSources ? "start od pierwszego źródła" : "kontynuacja od zapisanego kursora";
    if (source === "jdg") return `${target} rekordów · ${region} · CEIDG · Fast · ${sourcePosition}`;
    return `${target} firm · ${region} · ${mode === "fast" ? "Fast" : "Deep"} · oświata/urzędy ${includePublic ? "ON" : "OFF"} · ${sourcePosition}`;
  }, [source, target, mode, includePublic, resetSources, region]);

  async function loadRuns() {
    try {
      const response = await fetch("/api/lead-factory/runs", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setRuns(data.runs || []);
    } catch {
      // Historia jest dodatkiem; pojedynczy błąd odświeżenia nie blokuje kampanii.
    }
  }

  useEffect(() => { void loadRuns(); }, []);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(`/api/lead-factory/status?requestId=${encodeURIComponent(requestId)}`, { cache: "no-store" });
        const data = await response.json();
        if (cancelled || !response.ok || !data.found) return;
        setCurrentRun(data.run);
        setCurrentArtifacts(data.artifacts || []);
        if (data.run.status === "completed") {
          setLoading(false);
          void loadRuns();
        }
      } catch {
        // Następny polling spróbuje ponownie.
      }
    };
    void check();
    const interval = window.setInterval(check, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [requestId]);

  function chooseSource(value: "companies" | "jdg") {
    setSource(value);
    if (value === "jdg") {
      setMode("fast");
      setIncludePublic(false);
    }
  }

  async function startRun() {
    if (!validTarget) {
      setError("Target partii musi być liczbą całkowitą od 1 do 500.");
      return;
    }
    setLoading(true);
    setError(null);
    setCurrentRun(null);
    setCurrentArtifacts([]);
    try {
      const response = await fetch("/api/lead-factory/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target, mode, includePublic, resetSources }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się uruchomić kampanii.");
      setRequestId(data.requestId);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Nie udało się uruchomić kampanii.");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
      <section className="rounded-2xl border border-[#e1e7ee] bg-white shadow-[0_8px_30px_rgba(31,48,65,.035)]">
        <div className="border-b border-[#edf1f5] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#edf3ff] p-2 text-[#568deb]"><Settings2 size={18}/></div>
            <div>
              <h2 className="font-bold text-[#2a3944]">Nowa kampania</h2>
              <div className="text-xs text-[#83909b]">Uruchomienie prawdziwego workflow PF Qualifier Campaigns</div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#81909c]">Profil</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => chooseSource("companies")} className={`rounded-xl border p-4 text-left transition ${source === "companies" ? "border-[#bcd0f8] bg-[#f1f5ff]" : "border-[#e3e9ef] bg-white hover:bg-[#fafbfd]"}`}>
                <Building2 size={19} className={source === "companies" ? "text-[#568deb]" : "text-[#7c8a96]"}/>
                <div className="mt-2 text-sm font-bold text-[#34434e]">Firmy 10+</div>
                <div className="mt-1 text-xs text-[#84919c]">PF / Baza-Firm / Śląskie</div>
              </button>
              <button type="button" onClick={() => chooseSource("jdg")} className={`rounded-xl border p-4 text-left transition ${source === "jdg" ? "border-[#bcd0f8] bg-[#f1f5ff]" : "border-[#e3e9ef] bg-white hover:bg-[#fafbfd]"}`}>
                <UserRound size={19} className={source === "jdg" ? "text-[#568deb]" : "text-[#7c8a96]"}/>
                <div className="mt-2 text-sm font-bold text-[#34434e]">JDG</div>
                <div className="mt-1 text-xs text-[#84919c]">Baza-Firm + CEIDG</div>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#81909c]">Region</span>
              <div className="flex h-11 items-center rounded-xl border border-[#dfe6ed] bg-[#f8fafc] px-3 text-sm font-semibold text-[#60717e]">{region}</div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#81909c]">Target partii</span>
              <input
                type="number"
                min={1}
                max={500}
                step={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-[#34434e] outline-none transition focus:border-[#9fbaf1] ${validTarget ? "border-[#dfe6ed]" : "border-red-300"}`}
              />
              <div className="mt-1.5 text-xs text-[#8a98a4]">Dowolna liczba od 1 do 500 rekordów.</div>
            </label>
          </div>

          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#81909c]">Tryb</span>
            <div className="grid grid-cols-2 rounded-xl border border-[#dfe6ed] bg-[#f7f9fb] p-1">
              <button type="button" onClick={() => setMode("fast")} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "fast" ? "bg-white text-[#436fcb] shadow-sm" : "text-[#7a8995]"}`}>Fast</button>
              <button type="button" disabled={source === "jdg"} onClick={() => setMode("deep")} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${source === "jdg" ? "cursor-not-allowed text-[#b4bec6]" : mode === "deep" ? "bg-white text-[#436fcb] shadow-sm" : "text-[#7a8995]"}`}>Deep</button>
            </div>
            {source === "jdg" && <div className="mt-1.5 text-xs text-[#8a98a4]">JDG w obecnym pipeline obsługuje tylko collect/Fast.</div>}
          </div>

          <div className="space-y-2">
            {source === "companies" && <Toggle checked={includePublic} onChange={setIncludePublic} label="Oświata i urzędy" description="Po włączeniu 20% partii jest celowane w JST/RSPO; przy niedoborze segment może uzupełnić brak." />}
            <Toggle checked={resetSources} onChange={setResetSources} label="Reset źródeł od początku" description="Domyślnie OFF: kontynuuj od ostatniego zapisanego kursora. ON: zacznij skan źródeł od pierwszej strony, zachowując historię i deduplikację." />
            {source === "companies" && <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <ShieldCheck size={18} className="shrink-0 text-emerald-600"/>
              <div><div className="text-sm font-semibold text-[#34434e]">Spółdzielnie: zawsze wykluczone</div><div className="mt-0.5 text-xs text-[#74838f]">To twardy prefiltr w PF, nie opcja frontendu.</div></div>
            </div>}
          </div>

          <div className="rounded-xl border border-[#e4eaf1] bg-[#f8fafc] px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a98a4]">Podsumowanie</div>
            <div className="mt-1.5 text-sm font-semibold text-[#465864]">{summary}</div>
          </div>

          {error && <div className="flex gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700"><AlertCircle size={17}/><span>{error}</span></div>}

          <button type="button" disabled={loading || !validTarget} onClick={startRun} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#568deb] px-4 text-sm font-bold text-white transition hover:bg-[#477fdf] disabled:cursor-not-allowed disabled:bg-[#9eb9e8]">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Play size={16}/>} {loading ? "Kampania uruchomiona — śledzę status" : "Uruchom kampanię"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-[#e1e7ee] bg-white p-5 shadow-[0_8px_30px_rgba(31,48,65,.035)]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 size={18}/></div>
            <div><h2 className="font-bold text-[#2a3944]">Bieżący run</h2><div className="text-xs text-[#83909b]">Status pobierany z GitHub Actions</div></div>
          </div>
          {!requestId && <div className="mt-4 rounded-xl border border-dashed border-[#dbe3eb] bg-[#fafbfd] px-4 py-6 text-center text-sm text-[#7a8995]">Uruchom kampanię, aby rozpocząć śledzenie.</div>}
          {requestId && !currentRun && <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f8fafc] px-3 py-3 text-sm text-[#60717e]"><Loader2 size={16} className="animate-spin"/> Dispatch przyjęty. Czekam aż run pojawi się w GitHub Actions…</div>}
          {currentRun && <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-[#f8fafc] px-3 py-3">
              <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[#526674]">Run #{currentRun.run_number}</span><span className={`text-xs font-bold ${currentRun.conclusion === "success" ? "text-emerald-600" : currentRun.status === "completed" ? "text-red-600" : "text-amber-600"}`}>{runLabel(currentRun)}</span></div>
              <div className="mt-1 truncate text-xs text-[#8a98a4]">{currentRun.display_title || currentRun.name}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={currentRun.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe6ed] px-3 py-2 text-xs font-bold text-[#60717e] hover:bg-[#f8fafc]">GitHub <ExternalLink size={13}/></a>
              {currentArtifacts.map((artifact) => <a key={artifact.id} href={`/api/lead-factory/artifact?id=${artifact.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf3ff] px-3 py-2 text-xs font-bold text-[#476fc2] hover:bg-[#e4edff]"><Download size={13}/>{artifact.name}.zip</a>)}
            </div>
          </div>}
        </div>

        <div className="rounded-2xl border border-[#e1e7ee] bg-white p-5 shadow-[0_8px_30px_rgba(31,48,65,.035)]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f0f3f6] p-2 text-[#657580]"><Clock3 size={18}/></div>
            <div><h2 className="font-bold text-[#2a3944]">Ostatnie kampanie</h2><div className="text-xs text-[#83909b]">Ostatnie runy PF Qualifier Campaigns</div></div>
          </div>
          <div className="mt-4 space-y-2">
            {runs.length === 0 && <div className="rounded-xl border border-dashed border-[#dbe3eb] bg-[#fafbfd] px-4 py-8 text-center"><Database size={22} className="mx-auto text-[#a5b0b9]"/><div className="mt-2 text-sm font-semibold text-[#667783]">Brak dostępnych runów</div></div>}
            {runs.slice(0, 6).map((run) => <div key={run.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fafc] px-3 py-2.5">
              <div className="min-w-0"><div className="truncate text-sm font-semibold text-[#526674]">Run #{run.run_number} · {run.display_title || run.name}</div><div className="text-xs text-[#97a2aa]">{new Date(run.created_at).toLocaleString("pl-PL")}</div></div>
              <div className="flex shrink-0 items-center gap-2"><span className={`text-xs font-bold ${run.conclusion === "success" ? "text-emerald-600" : run.status === "completed" ? "text-red-600" : "text-amber-600"}`}>{runLabel(run)}</span>{run.artifacts?.[0] && <a href={`/api/lead-factory/artifact?id=${run.artifacts[0].id}`} className="rounded-lg p-1.5 text-[#568deb] hover:bg-[#edf3ff]" title="Pobierz artefakt"><Download size={15}/></a>}</div>
            </div>)}
          </div>
        </div>
      </section>
    </div>
  );
}