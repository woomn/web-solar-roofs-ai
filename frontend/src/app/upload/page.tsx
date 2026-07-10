import UploadBox from "@/components/upload/uploadbox";

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <section>
        <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          GeoTIFF Upload
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
          อัปโหลดภาพ GeoTIFF
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          เลือกไฟล์ GeoTIFF (.tif / .tiff) ที่มี CRS, GSD และ Pixel Size
          เพื่อให้ระบบตรวจสอบ Metadata ก่อนเข้าสู่ขั้นตอน AI Detection
        </p>
      </section>

      <UploadBox />
    </div>
  );
}
