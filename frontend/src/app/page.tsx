import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-3xl border border-blue-100 bg-white p-6 sm:p-12">
        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-950 sm:text-5xl">
          ตรวจหาแผงโซลาร์เซลล์จากภาพถ่ายทางอากาศ
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-700">
          ใช้ภาพ GeoTIFF เพื่อดูบริเวณที่โมเดลตรวจพบ ตรวจทานภาพและพิกัด แล้วเปิดรายงานสำหรับพิมพ์หรือบันทึกเป็น PDF
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/upload" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">
            เลือกภาพเพื่อวิเคราะห์ <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/analysis" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-900">
            ดูผลล่าสุด
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="ขั้นตอนการวิเคราะห์">
        {[
          ["เลือกภาพ GeoTIFF", "อัปโหลดภาพถ่ายทางอากาศหรือดาวเทียมแบบ .tif หรือ .tiff"],
          ["ตรวจข้อมูลภาพ", "ระบบตรวจขนาดภาพ ระบบพิกัด และความละเอียดก่อนเริ่ม"],
          ["ตรวจทานผล", "ซูมดูบริเวณที่พบ เปรียบเทียบกับภาพต้นฉบับ และเปิดรายงาน"],
        ].map(([title, description]) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
