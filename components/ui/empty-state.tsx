export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
    <div className="font-medium text-zinc-900">{title}</div>
    <div className="mt-1 text-sm text-zinc-500">{description}</div>
  </div>;
}
