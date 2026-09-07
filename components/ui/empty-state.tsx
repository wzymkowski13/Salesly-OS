export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-[#dce3eb] bg-[#f8fafc] px-5 py-8 text-center">
    <div className="text-sm font-semibold text-[#35434e]">{title}</div>
    <div className="mt-1 text-xs leading-5 text-[#8996a1]">{description}</div>
  </div>;
}
