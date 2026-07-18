"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Download,
  FileText,
  Gauge,
  ImageIcon,
  Layers3,
  MapPin,
  Printer,
  Ruler,
  Zap,
} from "lucide-react";

type GeoTiffAnalysis = {
  success: boolean;
  filename: string;
  saved_filename: string;
  file_size_mb: number;
  metadata: {
    driver?: string;
    width: number;
    height: number;
    bands?: number;
    dtype?: string;

    crs?: string | null;
    crs_epsg: number | null;
    crs_is_projected?: boolean;
    crs_unit?: string | null;

    gsd_x: number;
    gsd_y: number;
    pixel_area_m2: number | null;

    bounds?: {
      left: number;
      bottom: number;
      right: number;
      top: number;
    };
  };
  validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
};

type DetectedLocation = {
  region_id: number;
  confidence: number;
  mask_pixel_area: number;
  area_m2: number;
  center_pixel: {
    x: number;
    y: number;
  };
  map_coordinate: {
    x: number;
    y: number;
    crs: string | null;
  };
  latitude: number | null;
  longitude: number | null;
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

  detected_locations?: DetectedLocation[];

  input_preview: string;
  result_image: string;

  metadata?: {
    crs?: string | null;
    crs_epsg?: number | null;
    gsd_x?: number;
    gsd_y?: number;
    pixel_area_m2?: number;
    bounds?: {
      left: number;
      bottom: number;
      right: number;
      top: number;
    };
  };
};

export default function ReportPage() {
  const [metadata, setMetadata] = useState<GeoTiffAnalysis | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);

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

  const detectedRegionCount = result?.region_count ?? result?.panel_count ?? 0;

  const locations = useMemo(() => {
    return result?.detected_locations ?? [];
  }, [result]);

  const topLocations = useMemo(() => {
    return locations.slice(0, 10);
  }, [locations]);

  if (!metadata || !result) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />

        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          ยังไม่มีข้อมูลสำหรับสร้าง Report
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-slate-500">
          กรุณาอัปโหลด GeoTIFF ตรวจสอบ Metadata และรัน AI Detection ให้เสร็จก่อน
          ระบบจึงจะสามารถสร้างหน้าสรุปผลได้
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
            ไปหน้า AI Detection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <FileText className="h-4 w-4" />
              Solar Roof AI Report
            </div>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              รายงานสรุปผลการตรวจจับ Solar Rooftop
            </h1>

            <p className="mt-3 max-w-3xl break-words text-slate-500">
              รายงานนี้สรุปผลจากการวิเคราะห์ไฟล์ GeoTIFF ด้วย YOLO Segmentation
              โดยใช้ข้อมูล Metadata
              ของภาพเพื่อคำนวณพื้นที่จริงและพิกัดตำแหน่งของพื้นที่ที่ตรวจพบ
            </p>

            <p className="mt-3 break-words text-sm text-slate-400">
              ไฟล์ที่วิเคราะห์: {metadata.filename}
            </p>
          </div>

          {/* <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>

            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับไป AI Detection
            </Link>
          </div> */}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={<Layers3 className="h-6 w-6 text-blue-600" />}
          label="Detected Solar Regions"
          value={formatNumber(detectedRegionCount, 0)}
          unit="regions"
        />

        <SummaryCard
          icon={<Gauge className="h-6 w-6 text-emerald-600" />}
          label="Average Confidence"
          value={formatNumber(result.confidence, 2)}
          unit="%"
        />

        <SummaryCard
          icon={<Ruler className="h-6 w-6 text-purple-600" />}
          label="Total Solar Rooftop Area"
          value={formatNumber(result.detected_area_m2, 2)}
          unit="m²"
        />

        <SummaryCard
          icon={<BrainCircuit className="h-6 w-6 text-orange-600" />}
          label="Estimated Capacity"
          value={formatNumber(result.capacity_kwp, 2)}
          unit="kWp"
        />

        <SummaryCard
          icon={<Zap className="h-6 w-6 text-yellow-600" />}
          label="Estimated Energy / Day"
          value={formatNumber(result.daily_energy_kwh, 2)}
          unit="kWh/day"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <InfoSection title="File Information">
          <InfoRow label="Filename" value={metadata.filename} />
          <InfoRow
            label="File Size"
            value={`${formatNumber(metadata.file_size_mb, 2)} MB`}
          />
          <InfoRow
            label="Image Size"
            value={`${formatNumber(metadata.metadata.width, 0)} × ${formatNumber(
              metadata.metadata.height,
              0,
            )} px`}
          />
          <InfoRow
            label="Bands"
            value={
              metadata.metadata.bands
                ? `${metadata.metadata.bands} bands`
                : "N/A"
            }
          />
          <InfoRow label="Data Type" value={metadata.metadata.dtype ?? "N/A"} />
        </InfoSection>

        <InfoSection title="GeoTIFF Metadata">
          <InfoRow
            label="CRS"
            value={
              metadata.metadata.crs_epsg
                ? `EPSG:${metadata.metadata.crs_epsg}`
                : (metadata.metadata.crs ?? "Unknown")
            }
          />
          <InfoRow
            label="Projected CRS"
            value={
              metadata.metadata.crs_is_projected === undefined
                ? "N/A"
                : metadata.metadata.crs_is_projected
                  ? "Yes"
                  : "No"
            }
          />
          <InfoRow
            label="GSD"
            value={`${formatNumber(metadata.metadata.gsd_x, 4)} × ${formatNumber(
              metadata.metadata.gsd_y,
              4,
            )} m/pixel`}
          />
          <InfoRow
            label="Pixel Area"
            value={
              metadata.metadata.pixel_area_m2 !== null
                ? `${formatNumber(metadata.metadata.pixel_area_m2, 4)} m²/pixel`
                : "N/A"
            }
          />
          <InfoRow
            label="Tile Size"
            value={`${formatNumber(result ? 1024 : 0, 0)} × ${formatNumber(
              result ? 1024 : 0,
              0,
            )} px`}
          />
        </InfoSection>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <ImageIcon className="h-6 w-6 text-slate-700" />
          <h2 className="text-2xl font-bold text-slate-900">
            Detection Result Image
          </h2>
        </div>

        <p className="mb-6 text-sm leading-6 text-slate-500">
          ภาพนี้แสดงผลลัพธ์จาก YOLO Segmentation โดยมีการ overlay mask
          บนบริเวณที่โมเดลตรวจพบว่าเป็น Solar Rooftop
        </p>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img
            src={result.result_image}
            alt="YOLO Segmentation Result"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">
                Detected Locations Summary
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              ตารางนี้แสดงตำแหน่งที่ตรวจพบแบบย่อ โดยแสดงสูงสุด 10 region แรก
              จากทั้งหมด {locations.length} regions
            </p>
          </div>

          <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {locations.length} regions
          </div>
        </div>

        {topLocations.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
            ไม่พบข้อมูล Detected Locations
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Region</th>
                    <th className="px-5 py-4 font-semibold">Confidence</th>
                    <th className="px-5 py-4 font-semibold">Area</th>
                    <th className="px-5 py-4 font-semibold">Center Pixel</th>
                    <th className="px-5 py-4 font-semibold">Latitude</th>
                    <th className="px-5 py-4 font-semibold">Longitude</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {topLocations.map((location) => (
                    <tr
                      key={location.region_id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        #{location.region_id}
                      </td>

                      <td className="px-5 py-4">
                        <ConfidenceBadge value={location.confidence} />
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {formatNumber(location.area_m2, 2)} m²
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        x={formatNumber(location.center_pixel.x, 2)}
                        <br />
                        y={formatNumber(location.center_pixel.y, 2)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {location.latitude !== null
                          ? formatNumber(location.latitude, 7)
                          : "N/A"}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {location.longitude !== null
                          ? formatNumber(location.longitude, 7)
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {locations.length > 10 && (
          <p className="mt-4 text-xs text-slate-400">
            แสดงเฉพาะ 10 region แรก หากต้องการดูทั้งหมดให้กลับไปที่หน้า AI
            Detection
          </p>
        )}
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">
          Calculation Summary
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          การคำนวณพื้นที่จริงใช้พื้นที่ของ mask ที่โมเดลตรวจพบคูณกับค่า pixel
          area จาก GeoTIFF Metadata
          จากนั้นนำพื้นที่ที่ได้ไปประมาณกำลังผลิตติดตั้ง
          และพลังงานไฟฟ้าต่อวันเบื้องต้น
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FormulaBox
            label="Area Calculation"
            value={`${formatNumber(result.mask_pixel_area, 2)} px × ${formatNumber(
              result.pixel_area_m2,
              4,
            )} m²/px`}
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

        <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          หมายเหตุ: ค่ากำลังผลิตและพลังงานเป็นการประมาณเบื้องต้น
          โดยใช้สมมติฐานพื้นที่ 5.5 m² ต่อ 1 kWp และ specific yield 5
          kWh/kWp/day ไม่ใช่การคำนวณทางวิศวกรรมเต็มรูปแบบ
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไป AI Detection
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
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

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
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

function ConfidenceBadge({ value }: { value: number }) {
  const badgeClass =
    value >= 70
      ? "bg-emerald-50 text-emerald-700"
      : value >= 40
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}
    >
      {formatNumber(value, 2)}%
    </span>
  );
}

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
