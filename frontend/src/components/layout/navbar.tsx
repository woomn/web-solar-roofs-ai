import Link from "next/link";

export default function Navbar() {
  return (
    <header className="no-print flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 sm:px-8">
      <Link href="/" className="text-sm font-bold text-slate-900 sm:text-base">Solar Roof AI</Link>
      <Link href="/upload" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        เริ่มวิเคราะห์ใหม่
      </Link>
    </header>
  );
}
