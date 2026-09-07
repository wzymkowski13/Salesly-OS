export default function Loading() {
  return <div className="relative min-h-[55vh] overflow-hidden rounded-[24px] border border-[#e4eaf0] bg-white/60 p-6">
    <div className="salesly-progress absolute left-0 top-0 h-[3px] w-1/3 rounded-full bg-[#568deb]" />
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-44 rounded-xl bg-[#e9eef4]"/>
      <div className="grid gap-4 md:grid-cols-3"><div className="h-28 rounded-2xl bg-[#eef2f6]"/><div className="h-28 rounded-2xl bg-[#eef2f6]"/><div className="h-28 rounded-2xl bg-[#eef2f6]"/></div>
      <div className="h-72 rounded-2xl bg-[#eef2f6]"/>
    </div>
  </div>;
}
