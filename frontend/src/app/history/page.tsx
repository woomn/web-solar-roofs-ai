import { Clock3, FileText, Layers3, MapPin, Zap } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          <Clock3 className="h-4 w-4" />
          Analysis History
        </div>

        <h1 className="mt-5 text-3xl font-bold text-slate-900">
          ประวัติการวิเคราะห์
        </h1>

        <p className="mt-3 max-w-3xl text-slate-500">
          หน้านี้ออกแบบไว้สำหรับแสดงประวัติไฟล์ GeoTIFF ที่เคยวิเคราะห์ เช่น
          ชื่อไฟล์ วันที่วิเคราะห์ จำนวน Solar Rooftop regions พื้นที่รวม
          และพลังงานที่ประมาณได้
        </p>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
            <Clock3 className="h-8 w-8 text-slate-500" />
          </div>

          <h2 className="mt-6 text-2xl font-bold text-slate-900">
            History ยังอยู่ระหว่างพัฒนา
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            ในเวอร์ชันปัจจุบัน ระบบจะแสดงผลการวิเคราะห์ล่าสุดในหน้า AI Detection
            และหน้า Report ก่อน
            ส่วนหน้านี้จะใช้สำหรับเก็บประวัติการวิเคราะห์หลายไฟล์ในอนาคต
          </p>

          <div className="mt-8 grid gap-4 text-left md:grid-cols-2 lg:grid-cols-4">
            <FeatureItem
              icon={<FileText className="h-5 w-5 text-blue-600" />}
              title="File History"
              description="เก็บชื่อไฟล์ GeoTIFF ที่เคยวิเคราะห์"
            />

            <FeatureItem
              icon={<Layers3 className="h-5 w-5 text-purple-600" />}
              title="Region Count"
              description="แสดงจำนวน Solar Rooftop regions ที่ตรวจพบ"
            />

            <FeatureItem
              icon={<MapPin className="h-5 w-5 text-emerald-600" />}
              title="Detected Locations"
              description="เชื่อมโยงไปยังตำแหน่งที่ตรวจพบในแต่ละไฟล์"
            />

            <FeatureItem
              icon={<Zap className="h-5 w-5 text-yellow-600" />}
              title="Energy Summary"
              description="สรุปค่าพลังงานไฟฟ้าที่ประมาณได้"
            />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
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
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
        {icon}
      </div>

      <div className="mt-4 text-sm font-bold text-slate-900">{title}</div>

      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}
