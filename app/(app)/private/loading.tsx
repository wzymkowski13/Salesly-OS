export default function PrivateLoading() {
  return <div
    role="status"
    aria-live="polite"
    aria-label="Ładowanie modułu"
    className="relative min-h-[62vh] overflow-hidden rounded-[24px] border border-[#e3e8f1] bg-white/72 p-5 shadow-[0_8px_30px_rgba(31,48,65,.03)] sm:p-6"
  >
    <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-[#edf1f6]">
      <div className="salesly-progress h-full w-1/3 rounded-full bg-[#7461c8]" />
    </div>

    <div className="animate-pulse space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-3 w-20 rounded-full bg-[#ece9f7]"/>
          <div className="h-8 w-48 rounded-xl bg-[#e6e3f1]"/>
          <div className="h-4 w-72 max-w-[65vw] rounded-lg bg-[#eef1f5]"/>
        </div>
        <div className="hidden h-10 w-28 rounded-xl bg-[#eceff4] sm:block"/>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div
          key={index}
          className="h-[118px] rounded-[20px] border border-[#edf0f4] bg-[#f7f8fb] p-4"
        >
          <div className="h-3 w-24 rounded bg-[#e8ebf0]"/>
          <div className="mt-4 h-7 w-20 rounded-lg bg-[#e4e7ec]"/>
          <div className="mt-3 h-3 w-28 rounded bg-[#eceff3]"/>
        </div>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="h-[290px] rounded-[22px] border border-[#eceff3] bg-[#f8f9fb] p-5">
          <div className="h-5 w-36 rounded bg-[#e5e8ed]"/>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-11 rounded-xl bg-[#eceff3]"/>)}
          </div>
        </div>
        <div className="h-[290px] rounded-[22px] border border-[#eceff3] bg-[#f8f9fb] p-5">
          <div className="h-5 w-32 rounded bg-[#e5e8ed]"/>
          <div className="mt-6 h-28 rounded-2xl bg-[#eceff3]"/>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl bg-[#eef1f4]"/>
            <div className="h-16 rounded-xl bg-[#eef1f4]"/>
          </div>
        </div>
      </div>
    </div>

    <span className="sr-only">Ładowanie kolejnego widoku prywatnego…</span>
  </div>;
}
