import { useSyncExternalStore } from "react";
import type { AnalysisRecord, DetectionResult, GeoTiffAnalysis } from "./types";

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

export function saveCompleted(metadata: GeoTiffAnalysis, detection: DetectionResult) {
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
