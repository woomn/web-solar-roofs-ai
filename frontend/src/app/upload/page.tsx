import UploadBox from "@/components/upload/uploadbox";
import WorkflowSteps from "@/components/layout/workflow-steps";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <WorkflowSteps current={1} />
      <header>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-4xl">เลือกภาพเพื่อวิเคราะห์</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">ใช้ภาพถ่ายทางอากาศหรือดาวเทียมแบบ GeoTIFF ที่เห็นพื้นที่ที่ต้องการตรวจจับ</p>
      </header>
      <UploadBox />
    </div>
  );
}
