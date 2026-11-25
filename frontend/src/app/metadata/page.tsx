import MetadataResult from "@/components/metadata/metadataresult";
import WorkflowSteps from "@/components/layout/workflow-steps";

export default function MetadataPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <WorkflowSteps current={2} />
      <header>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-4xl">ตรวจข้อมูลภาพ</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">ดูว่าไฟล์พร้อมสำหรับการตรวจจับและตรวจสอบคำเตือนก่อนเริ่ม</p>
      </header>
      <MetadataResult />
    </div>
  );
}
