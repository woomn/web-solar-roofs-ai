import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

export default function ComingSoonPage({
  badge,
  title,
  description,
  items,
}: {
  badge: string;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="space-y-8">
      <section>
        <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          {badge}
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          {description}
        </p>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Clock3 className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              หน้านี้อยู่ระหว่างพัฒนา
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              หน้านี้ยังไม่ได้เปิดใช้งานเต็มรูปแบบ
              แต่ถูกเตรียมไว้สำหรับฟีเจอร์ของระบบจริง
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] bg-slate-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            สิ่งที่ควรมีในหน้านี้
          </h3>

          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            เริ่มวิเคราะห์ภาพใหม่
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
