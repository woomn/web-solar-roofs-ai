const steps = ["เลือกไฟล์", "ตรวจข้อมูลภาพ", "ดูผลตรวจจับ"];

export default function WorkflowSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="ขั้นตอนการวิเคราะห์" className="no-print grid grid-cols-3 gap-2 text-xs sm:text-sm">
      {steps.map((label, index) => (
        <li
          key={label}
          aria-current={index + 1 === current ? "step" : undefined}
          className={index + 1 === current ? "rounded-xl bg-blue-100 px-3 py-2 font-semibold text-blue-950" : "rounded-xl bg-slate-100 px-3 py-2 text-slate-600"}
        >
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}
