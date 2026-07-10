import AnalysisResult from "@/components/analysis/analysis-result";

export default function AnalysisPage() {
  return (
    <div className="space-y-8">
      <section>
        <div className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
          YOLO Segmentation
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
          ตรวจจับ Solar Rooftop ด้วย AI
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          ระบบจะ crop GeoTIFF เป็น tile ขนาด 1024×1024 px แล้วใช้โมเดล YOLO
          Segmentation ตรวจจับพื้นที่ Solar Rooftop ทีละ tile
        </p>
      </section>

      <AnalysisResult />
    </div>
  );
}
