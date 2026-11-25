"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import DetectionImageViewer from "@/components/analysis/detection-image-viewer";
import PrintReport from "@/components/report/print-report";
import ReportLocationTable from "@/components/report/report-location-table";
import { areaFormula, formatAnalysisDate, formatNumber } from "@/lib/analysis/formatters";
import type { AnalysisRecord } from "@/lib/analysis/types";

export default function ReportView({ record }: { record: AnalysisRecord }) {
  const [imageStatus, setImageStatus] = useState<"loading" | "ready" | "error">("loading");
  const { metadata, detection: result, analyzed_at: analyzedAt } = record;
  const detectedRegionCount = result.region_count ?? result.panel_count;
  const locations = result.detected_locations ?? [];

  return (
    <>
      <PrintReport
        metadata={metadata}
        result={result}
        detectedRegionCount={detectedRegionCount}
        locations={locations}
        analyzedAt={analyzedAt}
        imageStatus={imageStatus}
      />

      <div className="no-print mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">รายงานผลตรวจจับแผงโซลาร์เซลล์</h1>
              <p className="mt-2 break-all text-sm font-medium text-slate-700">{metadata.filename}</p>
              <p className="mt-1 text-sm text-slate-600">วิเคราะห์เมื่อ {formatAnalysisDate(analyzedAt)}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={imageStatus === "loading"}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {imageStatus === "loading" ? "กำลังโหลดภาพ…" : "พิมพ์ / บันทึกเป็น PDF"}
            </button>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3">
            {[
              ["บริเวณที่พบ", formatNumber(detectedRegionCount, 0)],
              ["คะแนนโมเดลเฉลี่ย", detectedRegionCount ? `${formatNumber(result.confidence)}%` : "—"],
              ["พื้นที่ที่ตรวจพบ", `${formatNumber(result.detected_area_m2, 1)} ตร.ม.`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{value}</dd>
              </div>
            ))}
          </dl>
          {detectedRegionCount === 0 && <p className="mt-3 text-sm text-slate-600">โมเดลไม่พบผลที่ผ่านเกณฑ์ในภาพนี้</p>}
        </header>

        <DetectionImageViewer
          metadata={metadata}
          result={result}
          onResultImageStatus={setImageStatus}
          LocationTable={ReportLocationTable}
        />

        <details className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <summary className="cursor-pointer font-semibold text-slate-950">ข้อมูลไฟล์และระบบพิกัด</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <InfoSection title="ข้อมูลไฟล์">
              <InfoRow label="ขนาดไฟล์" value={`${formatNumber(metadata.file_size_mb)} MB`} />
              <InfoRow label="ขนาดภาพ" value={`${formatNumber(metadata.metadata.width, 0)} × ${formatNumber(metadata.metadata.height, 0)} px`} />
              <InfoRow label="จำนวนแถบข้อมูล" value={metadata.metadata.bands === undefined ? "ไม่มีข้อมูล" : String(metadata.metadata.bands)} />
              <InfoRow label="ชนิดข้อมูล" value={metadata.metadata.dtype ?? "ไม่มีข้อมูล"} />
            </InfoSection>
            <InfoSection title="ข้อมูล GeoTIFF">
              <InfoRow label="ระบบพิกัด (CRS)" value={metadata.metadata.crs_epsg ? `EPSG:${metadata.metadata.crs_epsg}` : (metadata.metadata.crs ?? "ไม่มีข้อมูล")} />
              <InfoRow label="ระบบพิกัดแบบฉาย" value={metadata.metadata.crs_is_projected === undefined ? "ไม่มีข้อมูล" : metadata.metadata.crs_is_projected ? "ใช่" : "ไม่ใช่"} />
              <InfoRow label="ความละเอียด (GSD)" value={`${formatNumber(metadata.metadata.gsd_x, 4)} × ${formatNumber(metadata.metadata.gsd_y, 4)} เมตร/พิกเซล`} />
              <InfoRow label="พื้นที่ต่อพิกเซล" value={metadata.metadata.pixel_area_m2 === null ? "ไม่มีข้อมูล" : `${formatNumber(metadata.metadata.pixel_area_m2, 4)} ตร.ม./พิกเซล`} />
              <InfoRow label="ขนาดส่วนภาพ" value={result.tile_size ? `${result.tile_size} × ${result.tile_size} px` : "ไม่มีข้อมูล"} />
            </InfoSection>
          </div>
        </details>

        <details className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <summary className="cursor-pointer font-semibold text-slate-950">วิธีคำนวณพื้นที่และประมาณการพลังงาน</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <FormulaBox label="พื้นที่ที่ตรวจพบ" value={areaFormula(result)} result={`${formatNumber(result.detected_area_m2, 1)} ตร.ม.`} />
            <FormulaBox label="ประมาณการกำลังติดตั้ง" value={`${formatNumber(result.detected_area_m2, 1)} ÷ 5.5`} result={`${formatNumber(result.capacity_kwp, 1)} kWp`} />
            <FormulaBox label="ประมาณการพลังงานต่อวัน" value={`${formatNumber(result.capacity_kwp, 1)} × 5`} result={`${formatNumber(result.daily_energy_kwh, 1)} kWh/วัน`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">ใช้สมมติฐานพื้นที่ 5.5 ตร.ม. ต่อ 1 kWp และพลังงาน 5 kWh ต่อ kWp ต่อวัน ควรใช้ประกอบการประเมินเบื้องต้น</p>
        </details>

        <Link href="/analysis" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> กลับไปผลล่าสุด
        </Link>
      </div>
    </>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>

      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 md:flex-row md:items-start md:justify-between">
      <div className="text-sm font-medium text-slate-500">{label}</div>

      <div className="break-words text-sm font-semibold text-slate-900 md:max-w-[65%] md:text-right">
        {value}
      </div>
    </div>
  );
}

function FormulaBox({
  label,
  value,
  result,
}: {
  label: string;
  value: string;
  result: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-sm font-semibold text-slate-500">{label}</div>

      <div className="mt-3 break-words text-sm text-slate-600">{value}</div>

      <div className="mt-3 break-words text-xl font-bold text-slate-900">
        {result}
      </div>
    </div>
  );
}
