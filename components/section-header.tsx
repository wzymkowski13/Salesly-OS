export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#202d37] sm:text-[30px]">{title}</h1>
      {description && <p className="mt-1 text-sm text-[#71818d]">{description}</p>}
    </div>
    {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
  </div>;
}
