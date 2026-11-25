"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileCheck2, Upload } from "lucide-react";
import { solarRequest, writePending, type GeoTiffAnalysis, type UploadRequirements } from "@/lib/analysis";

export default function UploadBox() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [requirements, setRequirements] = useState<UploadRequirements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    solarRequest<UploadRequirements>("requirements", { signal: controller.signal })
      .then(setRequirements)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const onDrop = useCallback((files: File[], rejected: FileRejection[]) => {
    if (rejected.length) {
      setError(rejected.some(({ errors }) => errors.some(({ code }) => code === "too-many-files"))
        ? "เลือกได้ครั้งละหนึ่งไฟล์"
        : "กรุณาเลือกไฟล์ GeoTIFF ที่ลงท้ายด้วย .tif หรือ .tiff");
      return;
    }
    if (files[0]) {
      setFile(files[0]);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/tiff": [".tif", ".tiff"], "application/octet-stream": [".tif", ".tiff"] },
    multiple: false,
    disabled: loading,
    noClick: true,
    noKeyboard: true,
  });

  async function checkFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await solarRequest<GeoTiffAnalysis>("analyze-geotiff", { method: "POST", body: form });
      try {
        writePending(data);
      } catch {
        throw new Error("เบราว์เซอร์บันทึกงานนี้ไม่ได้ กรุณาเปิดใช้พื้นที่จัดเก็บแล้วลองใหม่");
      }
      router.push("/metadata");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ตรวจไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={checkFile} className="space-y-5" aria-busy={loading}>
      <div {...getRootProps()} className={`rounded-3xl border-2 border-dashed p-6 text-center sm:p-12 ${isDragActive ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"}`}>
        {file ? <FileCheck2 className="mx-auto mb-4 h-9 w-9 text-emerald-700" aria-hidden="true" /> : <Upload className="mx-auto mb-4 h-9 w-9 text-blue-700" aria-hidden="true" />}
        <p className="break-all text-lg font-semibold text-slate-950">{file ? file.name : "ลากไฟล์ GeoTIFF มาวางที่นี่"}</p>
        <p className="mt-1 text-sm text-slate-600">
          {file ? `${(file.size / 1024 / 1024).toLocaleString("th-TH", { maximumFractionDigits: 2 })} MB` : "รองรับ .tif และ .tiff ครั้งละหนึ่งไฟล์"}
        </p>
        <label className="relative mt-5 inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 focus-within:ring-2 focus-within:ring-blue-600">
          {file ? "เลือกไฟล์อื่น" : "เลือกไฟล์ GeoTIFF"}
          <input {...getInputProps({ style: undefined, className: "sr-only", "aria-describedby": "file-requirements" })} />
        </label>
        {error && <p role="alert" className="mt-4 whitespace-pre-line text-sm font-medium text-red-800">{error}</p>}
      </div>

      <div id="file-requirements" className="space-y-1 text-sm leading-6 text-slate-600">
        {requirements ? (
          <>
            <p>กว้างและสูง {requirements.min_size.toLocaleString()}–{requirements.max_size.toLocaleString()} px · อย่างน้อย {requirements.min_bands} bands (RGB) · ระบบพิกัดแบบ Projected CRS เช่น UTM</p>
            <p>GSD ไม่เกิน {requirements.max_gsd} เมตร/พิกเซล ค่าต่ำกว่า {requirements.recommended_min_gsd} ยังใช้ได้และจะแสดงคำเตือน</p>
          </>
        ) : <p>ระบบจะตรวจขนาดภาพ ระบบพิกัด และความละเอียดเมื่อส่งไฟล์</p>}
      </div>
      <button type="submit" disabled={!file || loading} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
        {loading ? "กำลังตรวจไฟล์…" : "ตรวจข้อมูลภาพ"}
      </button>
      {loading && <span role="status" className="sr-only">กำลังตรวจข้อมูลภาพ กรุณารอ</span>}
    </form>
  );
}
