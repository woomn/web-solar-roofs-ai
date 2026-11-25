import AnalysisResult from "@/components/analysis/analysis-result";
import WorkflowSteps from "@/components/layout/workflow-steps";

export default function AnalysisPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <WorkflowSteps current={3} />
      <header>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-4xl">ผลตรวจจับแผงโซลาร์เซลล์</h1>
      </header>
      <AnalysisResult />
    </div>
  );
}
