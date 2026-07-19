import Link from "next/link";
import { UploadCloud } from "lucide-react";

export default function Navbar() {
  return (
    <header className="no-print flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <h2 className="text-xl font-bold text-emerald-700">Solar Roof AI</h2>
        <p className="text-xs text-slate-500">
          GeoTIFF Solar Rooftop Detection System
        </p>
      </div>

      <Link
        href="/upload"
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        <UploadCloud className="h-4 w-4" />
        เริ่มวิเคราะห์ใหม่
      </Link>
    </header>
  );
}
