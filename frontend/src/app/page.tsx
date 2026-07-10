import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  FileImage,
  Layers3,
  MapPinned,
  Ruler,
  Satellite,
  Upload,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="grid gap-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
        <div>
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            GeoTIFF Solar Rooftop Analysis
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 lg:text-5xl">
            วิเคราะห์ Solar Rooftop จากภาพ GeoTIFF ด้วย AI
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 lg:text-lg">
            อัปโหลดไฟล์ GeoTIFF เพื่อให้ระบบอ่าน Metadata
            ตรวจจับพื้นที่แผงโซลาร์เซลล์ ด้วย YOLO Segmentation
            และคำนวณพื้นที่จริงพร้อมประมาณกำลังผลิตไฟฟ้าเบื้องต้น
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              เริ่มวิเคราะห์ภาพ
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ดูผลการตรวจจับล่าสุด
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-bold text-slate-900">Supported Input</h2>

          <div className="mt-6 space-y-4">
            <RequirementItem
              icon={<FileImage className="h-5 w-5 text-blue-600" />}
              title="File Type"
              value=".tif / .tiff"
            />

            <RequirementItem
              icon={<MapPinned className="h-5 w-5 text-emerald-600" />}
              title="Coordinate System"
              value="Projected CRS เช่น UTM"
            />

            <RequirementItem
              icon={<Ruler className="h-5 w-5 text-purple-600" />}
              title="GSD"
              value="0.3–0.6 m/pixel"
            />

            <RequirementItem
              icon={<Layers3 className="h-5 w-5 text-orange-600" />}
              title="Processing Tile"
              value="1024×1024 px"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <FeatureCard
          icon={<Upload className="h-6 w-6 text-blue-600" />}
          title="Upload GeoTIFF"
          description="รับไฟล์ภาพถ่ายทางอากาศหรือภาพดาวเทียมรูปแบบ GeoTIFF ที่มี Metadata"
        />

        <FeatureCard
          icon={<Satellite className="h-6 w-6 text-emerald-600" />}
          title="Read Metadata"
          description="อ่านค่า CRS, GSD, Pixel Size และ Bounds ด้วย Rasterio"
        />

        <FeatureCard
          icon={<BrainCircuit className="h-6 w-6 text-purple-600" />}
          title="AI Detection"
          description="ตรวจจับพื้นที่ Solar Rooftop ด้วย YOLO Segmentation"
        />

        <FeatureCard
          icon={<Zap className="h-6 w-6 text-orange-600" />}
          title="Energy Estimate"
          description="คำนวณพื้นที่จริง กำลังติดตั้ง และพลังงานต่อวันเบื้องต้น"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">
            Analysis Workflow
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            ระบบประมวลผลภาพตามลำดับตั้งแต่อัปโหลดไฟล์จนถึงแสดงผลบน Dashboard
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            <WorkflowStep number="1" label="Upload" />
            <WorkflowStep number="2" label="Metadata" />
            <WorkflowStep number="3" label="Crop" />
            <WorkflowStep number="4" label="Detect" />
            <WorkflowStep number="5" label="Result" />
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-600">
              พื้นที่จริงคำนวณจาก{" "}
              <span className="font-semibold text-slate-900">
                mask pixel area × pixel area
              </span>{" "}
              โดย pixel area ได้จากค่า GSD ของไฟล์ GeoTIFF
            </p>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">Quick Actions</h2>

          <div className="mt-6 space-y-4">
            <QuickAction
              href="/upload"
              icon={<Upload className="h-5 w-5 text-blue-600" />}
              title="Upload New GeoTIFF"
              description="เริ่มวิเคราะห์ภาพใหม่"
            />

            <QuickAction
              href="/metadata"
              icon={<Satellite className="h-5 w-5 text-emerald-600" />}
              title="View Metadata"
              description="ดูข้อมูล CRS, GSD และ Pixel Size"
            />

            <QuickAction
              href="/analysis"
              icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
              title="View AI Detection"
              description="ดูผลตรวจจับและค่าคำนวณ"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function RequirementItem({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>

      <div>
        <div className="text-sm font-medium text-slate-500">{title}</div>

        <div className="mt-1 font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function WorkflowStep({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {number}
      </div>

      <div className="mt-5 text-sm font-bold text-slate-900">{label}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-900">{title}</div>

        <div className="mt-1 text-sm text-slate-500">{description}</div>
      </div>

      <ArrowRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}
