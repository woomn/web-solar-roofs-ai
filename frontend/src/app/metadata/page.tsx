import MetadataResult from "@/components/metadata/metadataresult";

export default function MetadataPage() {
  return (
    <div className="space-y-8">
      <section>
        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          Metadata Validation
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
          ตรวจสอบ Metadata ของ GeoTIFF
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          ระบบอ่านค่า CRS, GSD, Pixel Size, Bounds และขนาดภาพจาก GeoTIFF
          เพื่อใช้ตรวจสอบความพร้อมก่อนส่งเข้าสู่ AI Detection
        </p>
      </section>

      <MetadataResult />
    </div>
  );
}
