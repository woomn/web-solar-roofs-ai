"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, History, LayoutDashboard, UploadCloud } from "lucide-react";

const navItems = [
  { href: "/", label: "หน้าแรก", icon: LayoutDashboard },
  { href: "/upload", label: "วิเคราะห์ภาพ", icon: UploadCloud },
  { href: "/analysis", label: "ผลล่าสุด", icon: BrainCircuit },
  { href: "/history", label: "ประวัติ", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print shrink-0 border-b border-slate-200 bg-slate-950 text-white lg:w-56 lg:border-0 lg:p-5">
      <div className="hidden px-3 pb-7 pt-3 text-xl font-bold lg:block">Solar Roof AI</div>
      <nav aria-label="เมนูหลัก" className="flex flex-wrap gap-1 px-2 py-2 lg:flex-col lg:p-0">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/upload"
            ? pathname === "/upload" || pathname === "/metadata"
            : pathname === href.split("?")[0];
          return (
            <Link key={href} href={href} aria-current={isActive ? "page" : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-blue-700 text-white" : "text-slate-200 hover:bg-slate-800"}`}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
