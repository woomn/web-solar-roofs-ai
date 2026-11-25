"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import ReportView from "@/components/report/report-view";
import { readHistory, readLatest, useStorageReady } from "@/lib/analysis/storage";

export default function ReportPage() {
  return <Suspense fallback={<p role="status">กำลังเปิดรายงาน…</p>}><ReportSelection /></Suspense>;
}

function ReportSelection() {
  const params = useSearchParams();
  const ready = useStorageReady();
  if (!ready) return <p role="status">กำลังเปิดรายงาน…</p>;
  const id = params.get("id");
  const record = id ? readHistory().find((entry) => entry.id === id) : readLatest();

  if (!record) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />

        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          ไม่พบรายงานในเบราว์เซอร์นี้
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-slate-500">
          หากเปิดจากลิงก์ประวัติ รายการอาจอยู่ในเบราว์เซอร์อื่นหรือถูกลบแล้ว
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/upload"
            className="inline-flex rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            ไปหน้า Upload
          </Link>

          <Link
            href="/analysis"
            className="inline-flex rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ดูผลล่าสุด
          </Link>
        </div>
      </div>
    );
  }

  return <ReportView key={record.detection.result_image} record={record} />;
}
