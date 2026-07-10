"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Gauge,
  ImageIcon,
  Layers3,
  Loader2,
  Play,
  Ruler,
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
  confidence: number;
  mask_pixel_area: number;
  pixel_area_m2: number;
  detected_area_m2: number;
  capacity_kwp: number;
  daily_energy_kwh: number;
  input_preview: string;
  result_image: string;
};

type BackendErrorResponse = {
  detail?: string | string[];
};

export default function AnalysisResult() {
  const [metadata, setMetadata] = useState<GeoTiffAnalysis | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedMetadata = localStorage.getItem("geotiff_analysis");
    const storedDetection = localStorage.getItem("geotiff_detection");

    if (storedMetadata) {
      try {
        setMetadata(JSON.parse(storedMetadata));
      } catch {
        localStorage.removeItem("geotiff_analysis");
      }
    }

    if (storedDetection) {
      try {
        setResult(JSON.parse(storedDetection));
      } catch {
        localStorage.removeItem("geotiff_detection");
      }
    }
  }, []);

  const runDetection = async () => {
    if (!metadata) return;

    if (!metadata.validation.is_valid) {
      setErrorMessage(
        "GeoTIFF ยังไม่ผ่านการตรวจสอบ Metadata กรุณากลับไปตรวจสอบไฟล์อีกครั้ง",
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("http://127.0.0.1:8000/detect-geotiff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saved_filename: metadata.saved_filename,
        }),
      });

      const data = (await response
        .json()
        .catch(() => null)) as DetectionResult & BackendErrorResponse;

      if (!response.ok) {
        const detail = data?.detail;

        if (Array.isArray(detail)) {
          throw new Error(detail.join("\n"));
        }

        throw new Error(detail || "Backend detection error");
      }

      localStorage.setItem("geotiff_detection", JSON.stringify(data));
      setResult(data);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("เกิดข้อผิดพลาดขณะตรวจจับด้วย AI");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!metadata) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />

        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          ยังไม่มีข้อมูล GeoTIFF
        </h2>

        <p className="mt-3 text-slate-500">
          กรุณาอัปโหลดไฟล์ GeoTIFF และตรวจสอบ Metadata ก่อนเริ่ม AI Detection
        </p>

        <Link
          href="/upload"
          className="mt-8 inline-flex rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          ไปหน้า Upload
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
              YOLO Segmentation
            </div>

            <h2 className="mt-5 text-3xl font-bold text-slate-900">
              พร้อมตรวจจับ Solar Rooftop
            </h2>

            <p className="mt-3 break-words text-slate-500">
              ไฟล์: {metadata.filename}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Image Size: {metadata.metadata.width} × {metadata.metadata.height}{" "}
              px, GSD: {metadata.metadata.gsd_x} × {metadata.metadata.gsd_y}{" "}
              m/pixel, CRS:{" "}
              {metadata.metadata.crs_epsg
                ? `EPSG:${metadata.metadata.crs_epsg}`
                : "Unknown"}
            </p>
          </div>

          <button
            type="button"
            onClick={runDetection}
            disabled={loading}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังตรวจจับด้วย AI...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                เริ่มตรวจจับด้วย AI
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-6 w-6 shrink-0" />

            <div>
              <div className="font-bold">Detection Error</div>
              <div className="mt-1 text-sm leading-6">{errorMessage}</div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={<Layers3 className="h-6 w-6 text-blue-600" />}
              label="Detected Solar Regions"
              value={formatNumber(result.panel_count, 0)}
              unit="masks"
            />

            <MetricCard
              icon={<Gauge className="h-6 w-6 text-emerald-600" />}
              label="Average Confidence"
              value={formatNumber(result.confidence, 2)}
              unit="%"
            />

            <MetricCard
              icon={<Ruler className="h-6 w-6 text-purple-600" />}
              label="Solar Rooftop Area"
              value={formatNumber(result.detected_area_m2, 2)}
              unit="m²"
            />

            <MetricCard
              icon={<BrainCircuit className="h-6 w-6 text-orange-600" />}
              label="Estimated Capacity"
              value={formatNumber(result.capacity_kwp, 2)}
              unit="kWp"
            />

            <MetricCard
              icon={<Zap className="h-6 w-6 text-yellow-600" />}
              label="Estimated Energy / Day"
              value={formatNumber(result.daily_energy_kwh, 2)}
              unit="kWh/day"
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ImagePanel title="Input Preview" imageUrl={result.input_preview} />

            <ImagePanel
              title="YOLO Segmentation Result"
              imageUrl={result.result_image}
            />
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900">
              Calculation Summary
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              สรุปการคำนวณจากผลลัพธ์ YOLO Segmentation โดยใช้พื้นที่ของ mask
              ร่วมกับค่า pixel area จาก GeoTIFF Metadata
              ค่ากำลังผลิตและพลังงานเป็นการประมาณเบื้องต้น โดยใช้สมมติฐานพื้นที่
              5.5 m² ต่อ 1 kWp และ specific yield 5 kWh/kWp/day
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <FormulaBox
                label="Area Calculation"
                value={`${formatNumber(
                  result.mask_pixel_area,
                  2,
                )} px × ${formatNumber(result.pixel_area_m2, 4)} m²/px`}
                result={`${formatNumber(result.detected_area_m2, 2)} m²`}
              />

              <FormulaBox
                label="Capacity Estimate"
                value={`${formatNumber(result.detected_area_m2, 2)} ÷ 5.5`}
                result={`${formatNumber(result.capacity_kwp, 2)} kWp`}
              />

              <FormulaBox
                label="Daily Energy Estimate"
                value={`${formatNumber(result.capacity_kwp, 2)} × 5`}
                result={`${formatNumber(result.daily_energy_kwh, 2)} kWh/day`}
              />
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              ค่ากำลังผลิตและพลังงานเป็นการประมาณเบื้องต้น โดยใช้สมมติฐานพื้นที่
              5.5 m² ต่อ 1 kWp และ specific yield 5 kWh/kWp/day
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/metadata"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับไป Metadata
            </Link>

            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              วิเคราะห์ไฟล์ใหม่
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>

      <div className="mt-5 text-sm font-medium text-slate-500">{label}</div>

      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>

      <div className="mt-1 text-sm text-slate-500">{unit}</div>
    </div>
  );
}

function ImagePanel({ title, imageUrl }: { title: string; imageUrl: string }) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <ImageIcon className="h-6 w-6 text-slate-700" />
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <img
          src={imageUrl}
          alt={title}
          className="h-auto w-full object-contain"
        />
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

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
