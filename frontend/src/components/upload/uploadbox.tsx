"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileCheck2,
  FileWarning,
  ArrowRight,
  Database,
  Ruler,
  Globe2,
  ImageIcon,
  RefreshCcw,
  AlertTriangle,
  Info,
} from "lucide-react";

type UploadedGeoTiff = {
  file: File;
  isGeoTiff: boolean;
};

type BackendErrorResponse = {
  detail?: string | string[];
};

export default function UploadBox() {
  const [uploaded, setUploaded] = useState<UploadedGeoTiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const clearPreviousAnalysis = () => {
    localStorage.removeItem("geotiff_analysis");
    localStorage.removeItem("geotiff_detection");
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    clearPreviousAnalysis();
    setErrorMessage("");

    const isGeoTiff =
      file.name.toLowerCase().endsWith(".tif") ||
      file.name.toLowerCase().endsWith(".tiff");

    setUploaded({
      file,
      isGeoTiff,
    });

    if (!isGeoTiff) {
      setErrorMessage(
        "ไฟล์นี้ไม่ใช่ GeoTIFF กรุณาเลือกไฟล์นามสกุล .tif หรือ .tiff เท่านั้น",
      );
    }
  }, []);

  const analyzeGeoTiff = async () => {
    if (!uploaded) return;

    if (!uploaded.isGeoTiff) {
      setErrorMessage(
        "รองรับเฉพาะไฟล์ GeoTIFF เท่านั้น กรุณาเลือกไฟล์ .tif หรือ .tiff",
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const formData = new FormData();
      formData.append("file", uploaded.file);

      const response = await fetch("http://127.0.0.1:8000/analyze-geotiff", {
        method: "POST",
        body: formData,
      });

      const data = (await response
        .json()
        .catch(() => null)) as BackendErrorResponse | null;

      if (!response.ok) {
        const detail = data?.detail;

        if (Array.isArray(detail)) {
          throw new Error(detail.join("\n"));
        }

        throw new Error(detail || "ไฟล์ไม่ผ่านเงื่อนไข GeoTIFF ที่ระบบกำหนด");
      }

      localStorage.setItem("geotiff_analysis", JSON.stringify(data));
      window.location.href = "/metadata";
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("เกิดข้อผิดพลาดขณะตรวจสอบไฟล์ GeoTIFF");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetSelectedFile = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    clearPreviousAnalysis();
    setUploaded(null);
    setErrorMessage("");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/tiff": [".tif", ".tiff"],
      "application/octet-stream": [".tif", ".tiff"],
    },
    multiple: false,
    maxFiles: 1,
  });

  const isButtonDisabled = !uploaded || loading || !uploaded.isGeoTiff;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div
            {...getRootProps()}
            className={`
              flex min-h-[430px] cursor-pointer flex-col items-center justify-center
              rounded-[28px] border-2 border-dashed p-8 text-center transition
              ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : errorMessage
                    ? "border-red-300 bg-red-50/40"
                    : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
              }
            `}
          >
            <input {...getInputProps()} />

            {!uploaded ? (
              <>
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <Upload className="h-12 w-12 text-blue-600" />
                </div>

                <h2 className="mt-6 text-2xl font-bold text-slate-900">
                  ลากไฟล์ GeoTIFF มาวางที่นี่
                </h2>

                <p className="mt-3 max-w-xl text-slate-500">
                  รองรับเฉพาะไฟล์ GeoTIFF (.tif / .tiff) ขนาดภาพ 1024×1024 ถึง
                  5000×5000 px ที่มี Projected CRS เช่น UTM และมีค่า GSD
                  อยู่ในช่วง 0.3–0.6 m/pixel
                </p>

                <button
                  type="button"
                  className="mt-8 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  เลือกไฟล์ GeoTIFF
                </button>
              </>
            ) : (
              <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-center">
                  {uploaded.isGeoTiff ? (
                    <FileCheck2 className="h-14 w-14 text-emerald-600" />
                  ) : (
                    <FileWarning className="h-14 w-14 text-red-600" />
                  )}
                </div>

                <h3 className="mt-5 break-words text-xl font-bold text-slate-900">
                  {uploaded.file.name}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {formatFileSize(uploaded.file.size)}
                </p>

                <div
                  className={`
                    mt-5 rounded-2xl px-4 py-3 text-sm font-medium
                    ${
                      uploaded.isGeoTiff
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }
                  `}
                >
                  {uploaded.isGeoTiff
                    ? "ไฟล์เป็น .tif / .tiff แล้ว ระบบจะตรวจสอบ CRS, GSD, Pixel Size และขนาดภาพในขั้นตอนถัดไป"
                    : "ไฟล์นี้ไม่ใช่ GeoTIFF กรุณาเลือกไฟล์ .tif หรือ .tiff"}
                </div>

                <button
                  type="button"
                  onClick={resetSelectedFile}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  เลือกไฟล์ใหม่
                </button>
              </div>
            )}
          </div>
        </div>

        {errorMessage && <ValidationErrorCard message={errorMessage} />}
      </div>

      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            GeoTIFF Requirements
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            ระบบจะตรวจสอบ Metadata ของ GeoTIFF ก่อนเริ่ม AI Detection
            เพื่อให้สามารถแปลงผลลัพธ์จาก pixel
            เป็นพื้นที่จริงในหน่วยตารางเมตรได้
          </p>

          <div className="mt-6 space-y-4">
            <RequirementItem
              icon={<Globe2 className="h-6 w-6 text-blue-600" />}
              title="CRS"
              description="ต้องเป็น Projected CRS เช่น UTM"
            />

            <RequirementItem
              icon={<Ruler className="h-6 w-6 text-emerald-600" />}
              title="GSD"
              description="ต้องอยู่ในช่วง 0.3–0.6 m/pixel"
            />

            <RequirementItem
              icon={<ImageIcon className="h-6 w-6 text-orange-600" />}
              title="Image Size"
              description="รองรับขนาดภาพ 1024×1024 ถึง 5000×5000 px"
            />

            <RequirementItem
              icon={<Database className="h-6 w-6 text-purple-600" />}
              title="Bands"
              description="ต้องมีอย่างน้อย 3 bands สำหรับ RGB"
            />
          </div>
        </div>

        <div className="rounded-[32px] border border-blue-100 bg-blue-600 p-8 text-white shadow-sm">
          <h3 className="text-2xl font-bold">พร้อมตรวจสอบ Metadata</h3>

          <p className="mt-3 leading-7 text-blue-50">
            หลังจากอัปโหลด ระบบจะส่งไฟล์ไปยัง Backend เพื่ออ่าน Metadata ด้วย
            Rasterio และตรวจสอบว่าไฟล์ตรงกับเงื่อนไขที่กำหนดหรือไม่
            ก่อนเข้าสู่ขั้นตอน AI Detection
          </p>

          <button
            type="button"
            onClick={analyzeGeoTiff}
            disabled={isButtonDisabled}
            className="
              mt-8 inline-flex w-full items-center justify-center gap-2
              rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-blue-700
              transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {loading ? "กำลังตรวจสอบ Metadata..." : "ตรวจสอบ Metadata"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {!uploaded && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-blue-500/40 p-4 text-sm leading-6 text-blue-50">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              กรุณาเลือกไฟล์ GeoTIFF ก่อนเริ่มตรวจสอบ Metadata
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ValidationErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-red-800">
            ไฟล์นี้ยังไม่พร้อมสำหรับการวิเคราะห์
          </h3>

          <p className="mt-2 whitespace-pre-line text-sm leading-6">
            {message}
          </p>

          <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-red-700">
            <div className="font-semibold">แนวทางแก้ไข</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>ใช้ไฟล์ GeoTIFF ที่มีขนาดภาพไม่เกิน 5000×5000 px</li>
              <li>ถ้าไฟล์ใหญ่เกินไป ให้ crop หรือ clip พื้นที่ก่อนอัปโหลด</li>
              <li>ตรวจสอบว่าไฟล์มี CRS, GSD และอย่างน้อย 3 bands</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
        {icon}
      </div>

      <div>
        <div className="font-semibold text-slate-900">{title}</div>

        <div className="text-sm text-slate-500">{description}</div>
      </div>
    </div>
  );
}

function formatFileSize(size: number) {
  const sizeMb = size / 1024 / 1024;

  if (sizeMb >= 1024) {
    return `${(sizeMb / 1024).toFixed(2)} GB`;
  }

  return `${sizeMb.toFixed(2)} MB`;
}
