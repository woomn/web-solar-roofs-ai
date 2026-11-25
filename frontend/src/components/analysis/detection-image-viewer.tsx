"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ComponentType } from "react";
import { formatNumber, outputUrl, type DetectedLocation, type DetectionResult, type GeoTiffAnalysis } from "@/lib/analysis";

type RegionShapes = Record<string, [number, number][]>;

export type RegionControls = {
  locations: DetectedLocation[];
  selectedId: number | null;
  viewerId: string;
  selectRegion: (id: number, trigger: HTMLButtonElement) => void;
};

export default function DetectionImageViewer({
  metadata,
  result,
  LocationTable,
  onResultImageStatus,
}: {
  metadata: GeoTiffAnalysis;
  result: DetectionResult;
  LocationTable?: ComponentType<RegionControls>;
  onResultImageStatus?: (status: "ready" | "error") => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<{ id: number } | null>(null);
  const [imageError, setImageError] = useState(false);
  const [shapes, setShapes] = useState<RegionShapes>({});
  const viewerId = useId();
  const regionTrigger = useRef<HTMLButtonElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const width = result.image_width ?? metadata.metadata.width;
  const height = result.image_height ?? metadata.metadata.height;
  const locations = result.detected_locations ?? [];
  const location = locations.find(({ region_id }) => region_id === selection?.id);

  const shape = location && shapes[location.region_id];
  const bbox = location?.bbox_pixel;
  const outline = shape?.length && shape.length >= 3
    ? `M ${shape.map(([x, y]) => `${x},${y}`).join(" L ")} Z`
    : bbox ? `M ${bbox[0]},${bbox[1]} H ${bbox[2]} V ${bbox[3]} H ${bbox[0]} Z` : null;
  const overlayUrl = outputUrl(result.result_image);
  const geometryUrl = result.region_geometry ? outputUrl(result.region_geometry)
    : overlayUrl.startsWith("/api/solar/outputs/")
      ? overlayUrl.replace(/_result\.jpg(?:\?.*)?$/, "_regions.json")
      : undefined;
  const needsShapes = locations.length > 0;

  useEffect(() => {
    if (!needsShapes || !geometryUrl || geometryUrl === overlayUrl) return;
    const controller = new AbortController();
    fetch(geometryUrl, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<RegionShapes> : null)
      .then((data) => { if (data) setShapes(data); })
      .catch(() => {});
    return () => controller.abort();
  }, [geometryUrl, needsShapes, overlayUrl]);

  useEffect(() => {
    const frame = viewport.current;
    const image = visual.current;
    if (!location || !frame || !image) return;
    frame.scrollTo({
      left: image.clientWidth * location.center_pixel.x / width - frame.clientWidth / 2,
      top: image.clientHeight * location.center_pixel.y / height - frame.clientHeight / 2,
    });
  }, [selection, location, width, height, zoom, imageError]);

  function selectRegion(id: number, trigger: HTMLButtonElement) {
    setShowOriginal(false);
    setImageError(false);
    setSelection({ id });
    setZoom((current) => Math.max(2, current));
    regionTrigger.current = trigger;
    viewport.current?.focus({ preventScroll: true });
    viewport.current?.scrollIntoView({ block: "start", inline: "nearest" });
  }

  function handleImageError() {
    setImageError(true);
    if (!showOriginal) onResultImageStatus?.("error");
  }

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">ตรวจทานภาพและตำแหน่ง</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" aria-pressed={showOriginal} onClick={() => { setShowOriginal(!showOriginal); setImageError(false); }} className="rounded-lg border px-3 py-2">
              {showOriginal ? "แสดงผลตรวจจับ" : "ดูภาพต้นฉบับ"}
            </button>
            <button type="button" onClick={() => setZoom(Math.max(1, zoom - 1))} disabled={zoom === 1} aria-label="ซูมออก" className="rounded-lg border px-3 py-2 disabled:opacity-40">−</button>
            <span className="self-center" aria-live="polite">{zoom}×</span>
            <button type="button" onClick={() => setZoom(Math.min(4, zoom + 1))} disabled={zoom === 4} aria-label="ซูมเข้า" className="rounded-lg border px-3 py-2 disabled:opacity-40">+</button>
          </div>
        </div>
        {!showOriginal && locations.length > 0 && !imageError && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-4 rounded-sm border border-teal-700 bg-teal-200/70" aria-hidden="true" />ขอบเขตที่ตรวจพบ</span>
            {location && <span role="status" className="font-medium text-teal-900">เลือกบริเวณ #{location.region_id}</span>}
            {location && LocationTable && (
              <button type="button" onClick={() => regionTrigger.current?.focus()} className="rounded font-medium text-blue-800 underline underline-offset-4 focus-visible:outline-2">
                กลับไปยังแถว #{location.region_id}
              </button>
            )}
          </div>
        )}
        {imageError ? (
          <p role="status" className="rounded-xl bg-slate-100 p-4 text-slate-700">เปิดภาพไม่ได้ ข้อมูลสรุปและพิกัดยังอ่านได้ด้านล่าง</p>
        ) : (
          <div id={viewerId} ref={viewport} tabIndex={0} aria-label="ภาพวิเคราะห์ เลื่อนเพื่อดูรายละเอียด" className="max-h-[65vh] scroll-mt-4 overflow-auto rounded-xl border border-slate-200 bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700">
            <div ref={visual} className="relative" style={{ width: `${zoom * 100}%` }}>
              <Image unoptimized loading="eager" src={showOriginal ? outputUrl(result.input_preview) : overlayUrl} width={width} height={height} alt={showOriginal ? "ภาพ GeoTIFF ก่อนตรวจจับ" : "ภาพแสดงขอบเขตที่โมเดลตรวจพบ"} onLoad={() => { if (!showOriginal) onResultImageStatus?.("ready"); }} onError={handleImageError} className="h-auto w-full" />
              {!showOriginal && location && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
                  {outline ? (
                    <>
                      <path d={outline} fill={shape ? "#9ff5e0" : "none"} fillOpacity="0.18" stroke="#082f2b" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      <path d={outline} fill="none" stroke="#e2fff3" strokeWidth="2" strokeLinejoin="round" strokeDasharray={shape ? undefined : "5 4"} vectorEffect="non-scaling-stroke" />
                    </>
                  ) : (
                    <circle cx={location.center_pixel.x} cy={location.center_pixel.y} r={Math.min(width, height) / 110} fill="#e2fff3" stroke="#082f2b" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  )}
                </svg>
              )}
            </div>
          </div>
        )}
        {!LocationTable && locations.length > 0 && (
          <ul aria-label="บริเวณที่ตรวจพบ" className="divide-y divide-slate-200">
            {locations.map((item) => (
              <li key={item.region_id} className="py-1">
                <button type="button" onClick={(event) => selectRegion(item.region_id, event.currentTarget)} aria-controls={viewerId} aria-pressed={item.region_id === selection?.id} className={`grid w-full gap-x-4 gap-y-1 rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-100 sm:grid-cols-[1fr_auto_auto] ${item.region_id === selection?.id ? "bg-blue-50 text-blue-950" : ""}`}>
                  <span className="font-semibold">บริเวณ #{item.region_id} · {formatNumber(item.area_m2, 1)} ตร.ม.</span>
                  <span>คะแนน {formatNumber(item.confidence)}%</span>
                  <span className="text-slate-600">{item.latitude !== null && item.longitude !== null ? `${formatNumber(item.latitude, 6)}, ${formatNumber(item.longitude, 6)}` : "ไม่มีพิกัด"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {LocationTable && <LocationTable locations={locations} selectedId={selection?.id ?? null} viewerId={viewerId} selectRegion={selectRegion} />}
    </>
  );
}
