"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  Satellite,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/upload",
    label: "Upload GeoTIFF",
    icon: UploadCloud,
  },
  {
    href: "/metadata",
    label: "Metadata",
    icon: Satellite,
  },
  {
    href: "/analysis",
    label: "AI Detection",
    icon: BrainCircuit,
  },
  {
    href: "/results",
    label: "Results",
    icon: BarChart3,
    status: "Soon",
  },
  {
    href: "/report",
    label: "Report",
    icon: FileText,
    status: "Soon",
  },
  {
    href: "/settings",
    label: "Configuration",
    icon: SlidersHorizontal,
    status: "Soon",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-slate-950 px-6 py-7 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solar Roof AI</h1>
        <p className="mt-1 text-sm text-slate-400">GeoTIFF Solar Analysis</p>
      </div>

      <nav className="mt-12 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }
              `}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.label}
              </span>

              {item.status && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  {item.status}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
