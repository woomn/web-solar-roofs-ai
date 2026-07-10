"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Ruler,
  Globe2,
  Database,
  ImageIcon,
} from "lucide-react";

type GeoTiffAnalysis = {
  success: boolean;
  filename: string;
  file_size_mb: number;
  metadata: {
    driver: string;
    width: number;
    height: number;
    bands: number;
    dtype: string;
    crs: string | null;
    crs_epsg: number | null;
    crs_is_projected: boolean;
    crs_unit: string | null;
    gsd_x: number;
    gsd_y: number;
    pixel_area_m2: number | null;
    bounds: {
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

export default function MetadataResult() {
  const [data, setData] = useState<GeoTiffAnalysis | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("geotiff_analysis");

    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  if (!data) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <FileText className="mx-auto h-14 w-14 text-slate-400" />

        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          ยังไม่มีข้อมูล Metadata
        </h2>

        <p className="mt-3 text-slate-500">กรุณาอัปโหลดไฟล์ GeoTIFF ก่อน</p>

        <Link
          href="/upload"
          className="mt-8 inline-flex rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          ไปหน้า Upload
        </Link>
      </div>
    );
  }

  const isValid = data.validation.is_valid;

  return (
    <div className="space-y-8">
      <div
        className={`
          rounded-[32px] border p-8 shadow-sm
          ${
            isValid
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }
        `}
      >
        <div className="flex items-start gap-5">
          {isValid ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          ) : (
            <XCircle className="h-12 w-12 text-red-600" />
          )}

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isValid
                ? "Metadata ผ่านการตรวจสอบ"
                : "Metadata ไม่ผ่านการตรวจสอบ"}
            </h2>

            <p className="mt-2 text-slate-600">ไฟล์: {data.filename}</p>

            <p className="mt-1 text-sm text-slate-500">
              ขนาดไฟล์: {data.file_size_mb} MB
            </p>
          </div>
        </div>
      </div>

      {data.validation.errors.length > 0 && (
        <div className="rounded-[32px] border border-red-200 bg-white p-8 shadow-sm">
          <h3 className="flex items-center gap-3 text-xl font-bold text-red-700">
            <XCircle className="h-6 w-6" />
            Errors
          </h3>

          <ul className="mt-5 space-y-3">
            {data.validation.errors.map((error, index) => (
              <li
                key={index}
                className="rounded-2xl bg-red-50 px-5 py-4 text-red-700"
              >
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.validation.warnings.length > 0 && (
        <div className="rounded-[32px] border border-amber-200 bg-white p-8 shadow-sm">
          <h3 className="flex items-center gap-3 text-xl font-bold text-amber-700">
            <AlertTriangle className="h-6 w-6" />
            Warnings
          </h3>

          <ul className="mt-5 space-y-3">
            {data.validation.warnings.map((warning, index) => (
              <li
                key={index}
                className="rounded-2xl bg-amber-50 px-5 py-4 text-amber-700"
              >
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetadataCard
          icon={<ImageIcon className="h-6 w-6 text-blue-600" />}
          label="Image Size"
          value={`${data.metadata.width} × ${data.metadata.height}`}
          detail="pixels"
        />

        <MetadataCard
          icon={<Ruler className="h-6 w-6 text-emerald-600" />}
          label="GSD"
          value={`${data.metadata.gsd_x} × ${data.metadata.gsd_y}`}
          detail="m/pixel"
        />

        <MetadataCard
          icon={<Database className="h-6 w-6 text-purple-600" />}
          label="Bands"
          value={`${data.metadata.bands}`}
          detail={data.metadata.dtype}
        />

        <MetadataCard
          icon={<Globe2 className="h-6 w-6 text-orange-600" />}
          label="CRS"
          value={
            data.metadata.crs_epsg
              ? `EPSG:${data.metadata.crs_epsg}`
              : "Unknown"
          }
          detail={
            data.metadata.crs_is_projected ? "Projected CRS" : "Not projected"
          }
        />
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Detailed Metadata</h3>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-200">
              <TableRow label="Driver" value={data.metadata.driver} />
              <TableRow label="CRS" value={data.metadata.crs ?? "Unknown"} />
              <TableRow
                label="CRS EPSG"
                value={
                  data.metadata.crs_epsg
                    ? `EPSG:${data.metadata.crs_epsg}`
                    : "Unknown"
                }
              />
              <TableRow
                label="CRS Unit"
                value={data.metadata.crs_unit ?? "Unknown"}
              />
              <TableRow
                label="Pixel Area"
                value={
                  data.metadata.pixel_area_m2
                    ? `${data.metadata.pixel_area_m2} m²/pixel`
                    : "Unknown"
                }
              />
              <TableRow label="Left" value={data.metadata.bounds.left} />
              <TableRow label="Bottom" value={data.metadata.bounds.bottom} />
              <TableRow label="Right" value={data.metadata.bounds.right} />
              <TableRow label="Top" value={data.metadata.bounds.top} />
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/upload"
          className="rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Upload ใหม่
        </Link>

        <Link
          href="/analysis"
          className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          ไปขั้นตอน AI Detection
        </Link>
      </div>
    </div>
  );
}

function MetadataCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>

      <div className="mt-5 text-sm font-medium text-slate-500">{label}</div>

      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>

      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </div>
  );
}

function TableRow({ label, value }: { label: string; value: string | number }) {
  return (
    <tr>
      <th className="w-56 bg-slate-50 px-5 py-4 font-semibold text-slate-700">
        {label}
      </th>
      <td className="px-5 py-4 text-slate-600">{value}</td>
    </tr>
  );
}
