"use client";

import Link from "next/link";
import { formatNumber, readLatest, useStorageReady } from "@/lib/analysis";
import DetectionImageViewer from "@/components/analysis/detection-image-viewer";

export default function AnalysisResult() {
  const ready = useStorageReady();
  if (!ready) return <p role="status">กำลังโหลดผลการวิเคราะห์…</p>;
  const record = readLatest();

  if (!record) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="mb-4 text-slate-700">ยังไม่มีผลการวิเคราะห์ในเบราว์เซอร์นี้</p>
        <Link href="/upload" className="font-semibold text-blue-800">เลือกภาพเพื่อวิเคราะห์</Link>
      </div>
    );
  }

  const { metadata, detection: result } = record;
  const count = result.region_count ?? result.panel_count;
  const locations = result.detected_locations ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8" aria-live="polite">
        <p className="break-all text-sm text-slate-600">{metadata.filename}</p>
        <h2 className="text-2xl font-bold text-slate-950">
          {count ? `พบ ${formatNumber(count, 0)} บริเวณที่ควรตรวจทาน` : "โมเดลไม่พบผลที่ผ่านเกณฑ์ในภาพนี้"}
        </h2>
        <p className="text-sm leading-6 text-slate-700">
          {count
            ? `คะแนนโมเดลเฉลี่ย ${formatNumber(result.confidence)}% ใช้ประกอบการตรวจภาพ หนึ่งบริเวณอาจมีหลายแผง`
            : "ลองตรวจว่าภาพครอบคลุมตำแหน่งที่ต้องการและเห็นรายละเอียดของแผงชัดเจน"}
        </p>
        {result.tiles_processed !== undefined && <p className="text-xs text-slate-600">ประมวลผลแล้ว {result.tiles_processed} ส่วนของภาพ</p>}
      </section>

      <DetectionImageViewer key={result.result_image} metadata={metadata} result={result} />

      {count > 0 && (
        <details className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <summary className="cursor-pointer font-semibold text-slate-950">พื้นที่และประมาณการพลังงาน</summary>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["พื้นที่ตรวจพบ", `${formatNumber(result.detected_area_m2, 1)} ตร.ม.`],
              ["กำลังติดตั้งโดยประมาณ", `${formatNumber(result.capacity_kwp, 1)} kWp`],
              ["พลังงานโดยประมาณ", `${formatNumber(result.daily_energy_kwh, 1)} kWh/วัน`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <dt className="text-sm text-slate-700">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {result.area_method === "equal_area" ? "พื้นที่รวมคำนวณจากขอบเขตที่ตรวจพบบนระบบพิกัดรักษาพื้นที่" : "ผลเดิมใช้พื้นที่ขอบเขตในภาพคูณพื้นที่ต่อพิกเซล"}
            {" "}ประมาณการใช้พื้นที่ 5.5 ตร.ม. ต่อ 1 kWp และพลังงาน 5 kWh ต่อ kWp ต่อวัน
          </p>
        </details>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/report" className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">เปิดรายงาน</Link>
        <Link href="/upload" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold">วิเคราะห์ไฟล์ใหม่</Link>
        {locations.length === 0 && count > 0 && <p className="self-center text-sm text-slate-600">ผลเดิมไม่มีพิกัดรายบริเวณ</p>}
      </div>
    </div>
  );
}
