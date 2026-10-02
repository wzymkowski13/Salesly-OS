"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ChevronDown, Factory, Gauge, Home, LineChart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Start", href: "/home", icon: Home, permission: null },
  { label: "Służbowe", href: "/dashboard", icon: BriefcaseBusiness, permission: "work.*" },
  { label: "Prywatne", href: "/private", icon: UserRound, permission: "private.*" },
  { label: "LeadFactory", href: "/lead-factory", icon: Factory, permission: "leadfactory.access" },
  { label: "SalesMetrics", href: "https://salesmetrics-v2.onrender.com/", icon: LineChart, external: true, permission: "external.salesmetrics" },
  { label: "Call Center Panel", href: "https://salesly.pl/panel", icon: Gauge, external: true, permission: "external.callcenter" },
] as const;

function currentLabel(pathname: string) {
  if (pathname === "/home") return "Start";
  if (pathname.startsWith("/private")) return "Prywatne";
  if (pathname.startsWith("/lead-factory")) return "LeadFactory";
  return "Służbowe";
}

function allows(permissions: Set<string>, permission: string | null) {
  if (!permission) return true;
  if (permissions.has("*") || permissions.has("admin.permissions") || permissions.has(permission)) return true;
  if (permission.endsWith(".*")) {
    const prefix = permission.slice(0, -1);
    return [...permissions].some(value => value.startsWith(prefix));
  }
  const namespace = permission.split(".")[0];
  return permissions.has(`${namespace}.*`);
}

export function WorkspaceSwitcher({ pathname, permissions: permissionList }: { pathname: string; permissions: string[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = currentLabel(pathname);
  const permissions = new Set(permissionList);
  const visibleItems = items.filter(item => allows(permissions, item.permission));

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return <div ref={rootRef} className="relative">
    <button
      type="button"
      onClick={() => setOpen(value => !value)}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dbe3ec] bg-white px-3 text-sm font-semibold text-[#344550] shadow-[0_1px_2px_rgba(31,48,65,.04)] transition hover:bg-[#f8fafc]"
    >
      {label}
      <ChevronDown size={15} className={cn("text-[#81909b] transition-transform", open && "rotate-180")}/>
    </button>

    {open && <div className="absolute right-0 top-12 z-[70] w-[230px] rounded-2xl border border-[#dfe6ee] bg-white p-2 shadow-[0_18px_50px_rgba(31,48,65,.16)]">
      {visibleItems.map(({ label: itemLabel, href, icon: Icon, ...item }) => {
        const external = "external" in item && item.external;
        const active = !external && (
          (href === "/home" && pathname === "/home")
          || (href === "/private" && pathname.startsWith("/private"))
          || (href === "/lead-factory" && pathname.startsWith("/lead-factory"))
          || (href === "/dashboard" && !pathname.startsWith("/private") && !pathname.startsWith("/lead-factory") && pathname !== "/home")
        );

        return <Link
          key={itemLabel}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
            active ? "bg-[#edf3ff] text-[#3567ce]" : "text-[#536674] hover:bg-[#f4f7fa] hover:text-[#273741]"
          )}
        >
          <Icon size={17} className={active ? "text-[#568deb]" : "text-[#8998a3]"}/>
          <span className="flex-1">{itemLabel}</span>
          {external && <span className="text-[10px] text-[#9aa6af]">↗</span>}
        </Link>;
      })}
    </div>}
  </div>;
}
