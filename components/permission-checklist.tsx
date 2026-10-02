import { PERMISSION_GROUPS } from "@/lib/permissions";

export function PermissionChecklist({
  selected = [],
  name = "permissions",
  includeAdmin = true,
}: {
  selected?: string[];
  name?: string;
  includeAdmin?: boolean;
}) {
  const selectedSet = new Set(selected);

  return <div className="grid gap-4 md:grid-cols-2">
    {PERMISSION_GROUPS
      .filter(group => includeAdmin || group.key !== "admin")
      .map(group => <div key={group.key} className="rounded-2xl border border-[#e4eaf0] bg-[#fbfcfe] p-4">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#84929d]">{group.label}</div>
        <div className="mt-3 space-y-2">
          {group.permissions.map(([key,label]) => <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-[#4f616e] transition hover:bg-white">
            <input
              type="checkbox"
              name={name}
              value={key}
              defaultChecked={selectedSet.has(key)}
              className="h-4 w-4 rounded border-[#cfd8e2]"
            />
            <span className="font-semibold">{label}</span>
            <span className="ml-auto font-mono text-[10px] text-[#a0abb3]">{key}</span>
          </label>)}
        </div>
      </div>)}
  </div>;
}
