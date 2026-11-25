import { useSyncExternalStore } from "react";

export type GeoTiffAnalysis = {
  success: boolean;
  filename: string;
  saved_filename: string;
  file_size_mb: number;
  metadata: {
    driver: string;
    width: number;
    height: number;
    bands: number;
    dtype: string;
    crs: string | null;
    crs_epsg: number | null;
    crs_is_projected: boolean;
    crs_unit: string | null;
    gsd_x: number;
    gsd_y: number;
    pixel_area_m2: number | null;
    image_area_m2?: number;
    tile_size?: number;
    bounds: { left: number; bottom: number; right: number; top: number };
  };
  validation: { is_valid: boolean; errors: string[]; warnings: string[] };
};

export type DetectedLocation = {
  region_id: number;
  confidence: number;
  mask_pixel_area: number;
  area_m2: number;
  center_pixel: { x: number; y: number };
  map_coordinate: { x: number; y: number; crs: string | null };
  latitude: number | null;
  longitude: number | null;
  bbox_pixel?: [number, number, number, number];
};

export type DetectionResult = {
  success: boolean;
  filename: string;
  analyzed_at?: string;
  image_width?: number;
  image_height?: number;
  tile_size?: number;
  tiles_processed?: number;
  panel_count: number;
  region_count?: number;
  confidence: number;
  mask_pixel_area: number;
  pixel_area_m2: number;
  detected_area_m2: number;
  capacity_kwp: number;
  daily_energy_kwh: number;
  area_method?: "equal_area";
  detected_locations?: DetectedLocation[];
  input_preview: string;
  result_image: string;
  region_geometry?: string;
};

export type AnalysisRecord = {
  id: string;
  analyzed_at: string | null;
  metadata: GeoTiffAnalysis;
  detection: DetectionResult;
};

export type UploadRequirements = {
  min_size: number;
  max_size: number;
  min_bands: number;
  recommended_min_gsd: number;
  max_gsd: number;
};

const latestKey = "solar_latest_analysis";
const pendingKey = "solar_pending_geotiff";
const historyKey = "solar_analysis_history";
const storageChanged = "solar-storage-changed";

function subscribeToStorage(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(storageChanged, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(storageChanged, listener);
  };
}

function storageSnapshot() {
  try {
    return JSON.stringify([latestKey, pendingKey, historyKey, "geotiff_analysis", "geotiff_detection"].map((key) => localStorage.getItem(key)));
  } catch {
    return "";
  }
}

export function useStorageReady() {
  return useSyncExternalStore(subscribeToStorage, storageSnapshot, () => null) !== null;
}

function readStored<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function readHistory(): AnalysisRecord[] {
  const history = readStored<AnalysisRecord[]>(historyKey);
  return Array.isArray(history)
    ? history.filter((item) => item?.metadata?.saved_filename && item?.detection?.filename)
    : [];
}

export function writeHistory(history: AnalysisRecord[]) {
  localStorage.setItem(historyKey, JSON.stringify(history));
  window.dispatchEvent(new Event(storageChanged));
}

export function readLatest(): AnalysisRecord | null {
  const latest = readStored<AnalysisRecord>(latestKey);
  if (latest?.metadata?.saved_filename && latest?.detection?.filename) return latest;

  const metadata = readStored<GeoTiffAnalysis>("geotiff_analysis");
  const detection = readStored<DetectionResult>("geotiff_detection");
  const history = readHistory();
  if (!metadata?.saved_filename || detection?.filename !== metadata.saved_filename) {
    return history[0] ?? null;
  }
  return history.find((entry) => entry.detection.result_image === detection.result_image)
    ?? { id: "", analyzed_at: detection.analyzed_at ?? null, metadata, detection };
}

export function readPending(): GeoTiffAnalysis | null {
  const pending = readStored<GeoTiffAnalysis>(pendingKey)
    ?? readStored<GeoTiffAnalysis>("geotiff_analysis");
  return pending?.saved_filename === readLatest()?.metadata.saved_filename ? null : pending;
}

export function writePending(metadata: GeoTiffAnalysis) {
  localStorage.setItem(pendingKey, JSON.stringify(metadata));
  window.dispatchEvent(new Event(storageChanged));
}

function saveCompleted(metadata: GeoTiffAnalysis, detection: DetectionResult) {
  const record: AnalysisRecord = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    analyzed_at: detection.analyzed_at ?? new Date().toISOString(),
    metadata,
    detection,
  };
  localStorage.setItem(latestKey, JSON.stringify(record));
  try {
    if (readStored<GeoTiffAnalysis>(pendingKey)?.saved_filename === metadata.saved_filename) {
      localStorage.removeItem(pendingKey);
    }
    localStorage.removeItem("geotiff_analysis");
    localStorage.removeItem("geotiff_detection");
    writeHistory([record, ...readHistory()].slice(0, 20));
  } catch {
    window.dispatchEvent(new Event(storageChanged));
    return false;
  }
  return true;
}

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
