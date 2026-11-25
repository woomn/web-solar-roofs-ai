"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { runAnalysis } from "@/lib/analysis/api";
import { formatNumber } from "@/lib/analysis/formatters";
import { readLatest, readPending, useStorageReady } from "@/lib/analysis/storage";

export default function MetadataResult() {
  const router = useRouter();
  const ready = useStorageReady();
  const pending = ready ? readPending() : null;
  const data = ready ? pending ?? readLatest()?.metadata ?? null : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyWarning, setHistoryWarning] = useState(false);

  async function detect() {
    if (!pending || loading) return;
    setLoading(true);
    setError("");
    try {
      const historySaved = await runAnalysis(pending);
      if (historySaved) router.push("/analysis");
      else setHistoryWarning(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ตรวจจับไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <p role="status">กำลังโหลดข้อมูลภาพ…</p>;
  if (!data) return <p>ยังไม่มีข้อมูลภาพ <Link href="/upload" className="font-semibold text-blue-800 underline">เลือกไฟล์ GeoTIFF</Link></p>;

  const { metadata, validation } = data;
  return (
    <div className="space-y-4" aria-busy={loading}>
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <h2 className="text-xl font-semibold">{validation.is_valid ? "ไฟล์ผ่านการตรวจสอบ" : "ไฟล์ไม่ผ่านการตรวจสอบ"}</h2>
        <p className="break-all text-slate-700">{data.filename}</p>
        <p className="text-sm text-slate-600">{metadata.width} × {metadata.height} px · {formatNumber(data.file_size_mb)} MB</p>
        {[...validation.errors, ...validation.warnings].length > 0 && (
          <ul className="list-disc space-y-1 rounded-xl bg-amber-50 p-4 pl-8 text-sm text-amber-950">
            {[...validation.errors, ...validation.warnings].map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {validation.is_valid && (pending ? (
            <button type="button" onClick={detect} disabled={loading} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {loading ? "กำลังตรวจจับ…" : error ? "ลองตรวจจับอีกครั้ง" : "เริ่มตรวจจับ"}
            </button>
          ) : (
            <Link href="/analysis" className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">ดูผลตรวจจับ</Link>
          ))}
          <Link href="/upload" className="text-sm font-semibold text-blue-800">เลือกไฟล์อื่น</Link>
        </div>
        {loading && <p role="status" className="text-sm text-blue-800">กำลังตรวจจับและสร้างภาพผลลัพธ์ เวลาที่ใช้ขึ้นอยู่กับขนาดภาพ</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        {historyWarning && <p role="alert" className="text-sm text-amber-900">ผลล่าสุดพร้อมเปิดดูแล้ว แต่เบราว์เซอร์บันทึกประวัติไม่ได้</p>}
      </section>
      <details className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <summary className="cursor-pointer font-semibold">รายละเอียด GeoTIFF</summary>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          {[
            ["ชนิดข้อมูล", `${metadata.driver} · ${metadata.dtype} · ${metadata.bands} bands`],
            ["ระบบพิกัด", metadata.crs ?? "ไม่มีข้อมูล"],
            ["หน่วยของ CRS", metadata.crs_unit ?? "ไม่มีข้อมูล"],
            ["ความละเอียดในระบบพิกัดภาพ (GSD)", `${formatNumber(metadata.gsd_x, 4)} × ${formatNumber(metadata.gsd_y, 4)} เมตร/พิกเซล`],
            ["พื้นที่ภาพบนพื้นดินโดยประมาณ", metadata.image_area_m2 === undefined ? "ไม่มีข้อมูล" : `${formatNumber(metadata.image_area_m2, 1)} ตร.ม.`],
            ["ขอบเขตภาพ (ซ้าย ล่าง ขวา บน)", [metadata.bounds.left, metadata.bounds.bottom, metadata.bounds.right, metadata.bounds.top].map((value) => formatNumber(value, 3)).join(" · ")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-600">{label}</dt>
              <dd className="mt-1 break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
