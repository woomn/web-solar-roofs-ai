import type { DetectionResult } from "./types";

export function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatAnalysisDate(date: string | null) {
  if (!date) return "ไม่มีข้อมูลวันที่";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "ไม่มีข้อมูลวันที่" : parsed.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function areaFormula(result: DetectionResult) {
  if (result.area_method === "equal_area") return "ผลรวมพื้นที่ของขอบเขตบนระบบพิกัดรักษาพื้นที่";
  return `${formatNumber(result.mask_pixel_area)} px × ${formatNumber(result.pixel_area_m2, 4)} m²/px`;
}
