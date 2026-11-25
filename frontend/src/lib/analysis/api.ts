import { saveCompleted } from "./storage";
import type { DetectionResult, GeoTiffAnalysis } from "./types";

export async function runAnalysis(metadata: GeoTiffAnalysis) {
  const result = await solarRequest<DetectionResult>("detect-geotiff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ saved_filename: metadata.saved_filename }),
  });
  try {
    return saveCompleted(metadata, result);
  } catch {
    throw new Error("เบราว์เซอร์บันทึกผลไม่ได้ กรุณาเพิ่มพื้นที่จัดเก็บแล้วลองใหม่");
  }
}

export function outputUrl(url: string): string {
  // Migrate the old absolute localhost URLs already saved in browser history.
  const path = url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000(?=\/outputs\/)/, "");
  if (!path.startsWith("/outputs/")) return path;
  // Refresh cached JPEGs when stored result overlays are regenerated in place.
  const version = path.endsWith("_result.jpg") ? "?overlay=4" : "";
  return `/api/solar${path}${version}`;
}

export async function solarRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/solar/${path}`, options);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("ติดต่อระบบวิเคราะห์ไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    if (Array.isArray(detail) && detail.every((item) => typeof item === "string")) {
      throw new Error(detail.join("\n"));
    }
    if (typeof detail === "string") throw new Error(detail);
    throw new Error("ระบบวิเคราะห์ยังไม่พร้อม กรุณาลองใหม่");
  }
  if (!data || typeof data !== "object") throw new Error("ระบบส่งข้อมูลกลับมาไม่ครบ กรุณาลองใหม่");
  return data as T;
}
