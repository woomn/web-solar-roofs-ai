"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  Eye,
  FileText,
  Layers3,
  Trash2,
  Zap,
} from "lucide-react";

type GeoTiffAnalysis = {
  success: boolean;
  filename: string;
  saved_filename: string;
  file_size_mb: number;
  metadata: {
    width: number;
    height: number;
    gsd_x: number;
    gsd_y: number;
    pixel_area_m2: number | null;
    crs_epsg: number | null;
  };
  validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
};

type DetectionResult = {
  success: boolean;
  filename: string;
  panel_count: number;
  region_count?: number;
  confidence: number;
  mask_pixel_area: number;
  pixel_area_m2: number;
  detected_area_m2: number;
  capacity_kwp: number;
  daily_energy_kwh: number;
  input_preview: string;
  result_image: string;
  detected_locations?: unknown[];
};

type AnalysisHistoryItem = {
  id: string;
  analyzed_at: string;
  metadata: GeoTiffAnalysis;
  detection: DetectionResult;
};

const HISTORY_KEY = "solar_analysis_history";

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem(HISTORY_KEY);

    if (!storedHistory) return;

    try {
      setHistory(JSON.parse(storedHistory));
    } catch {
      localStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    }
  }, []);

  const openReport = (item: AnalysisHistoryItem) => {
    localStorage.setItem("geotiff_analysis", JSON.stringify(item.metadata));
    localStorage.setItem("geotiff_detection", JSON.stringify(item.detection));
  };

  const deleteItem = (id: string) => {
    const updatedHistory = history.filter((item) => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    const confirmed = window.confirm(
      "ต้องการลบประวัติการวิเคราะห์ทั้งหมดหรือไม่?",
    );

    if (!confirmed) return;

    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <Clock3 className="h-4 w-4" />
              Analysis History
            </div>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              ประวัติการวิเคราะห์
            </h1>

            <p className="mt-3 max-w-3xl text-slate-500">
              หน้านี้แสดงรายการไฟล์ GeoTIFF ที่เคยวิเคราะห์ พร้อมผลตรวจจับ
              พื้นที่รวม กำลังผลิต และพลังงานไฟฟ้าที่ประมาณได้
            </p>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear History
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <EmptyHistory />
      ) : (
        <div className="space-y-5">
          {history.map((item) => {
            const regionCount =
              item.detection.region_count ?? item.detection.panel_count ?? 0;

            return (
              <div
                key={item.id}
                className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="break-words text-xl font-bold text-slate-900">
                          {item.metadata.filename}
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                          วิเคราะห์เมื่อ {formatDateTime(item.analyzed_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-4">
                      <MiniStat
                        icon={<Layers3 className="h-4 w-4 text-blue-600" />}
                        label="Regions"
                        value={formatNumber(regionCount, 0)}
                      />

                      <MiniStat
                        label="Area"
                        value={`${formatNumber(
                          item.detection.detected_area_m2,
                          2,
                        )} m²`}
                      />

                      <MiniStat
                        label="Capacity"
                        value={`${formatNumber(
                          item.detection.capacity_kwp,
                          2,
                        )} kWp`}
                      />

                      <MiniStat
                        icon={<Zap className="h-4 w-4 text-yellow-600" />}
                        label="Energy / Day"
                        value={`${formatNumber(
                          item.detection.daily_energy_kwh,
                          2,
                        )} kWh`}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Link
                      href="/report"
                      onClick={() => openReport(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      View Report
                    </Link>

                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
      <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />

      <h2 className="mt-5 text-2xl font-bold text-slate-900">
        ยังไม่มีประวัติการวิเคราะห์
      </h2>

      <p className="mx-auto mt-3 max-w-2xl text-slate-500">
        เมื่อคุณอัปโหลด GeoTIFF และรัน AI Detection สำเร็จ
        ผลลัพธ์จะถูกบันทึกไว้ในหน้านี้โดยอัตโนมัติ
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/upload"
          className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          วิเคราะห์ไฟล์ใหม่
        </Link>

        <Link
          href="/analysis"
          className="rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ไปหน้า AI Detection
        </Link>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
