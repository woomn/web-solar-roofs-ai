"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Download,
  FileText,
  Gauge,
  ImageIcon,
  Layers3,
  MapPin,
  Ruler,
  Zap,
} from "lucide-react";

type GeoTiffAnalysis = {
  success: boolean;
  filename: string;
  saved_filename: string;
  file_size_mb: number;
  metadata: {
    driver?: string;
    width: number;
    height: number;
    bands?: number;
    dtype?: string;

    crs?: string | null;
    crs_epsg: number | null;
    crs_is_projected?: boolean;
    crs_unit?: string | null;

    gsd_x: number;
    gsd_y: number;
    pixel_area_m2: number | null;

    bounds?: {
      left: number;
      bottom: number;
      right: number;
      top: number;
    };
  };
  validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
};

type DetectedLocation = {
  region_id: number;
  confidence: number;
  mask_pixel_area: number;
  area_m2: number;
  center_pixel: {
    x: number;
    y: number;
  };
  map_coordinate: {
    x: number;
    y: number;
    crs: string | null;
  };
  latitude: number | null;
  longitude: number | null;
};

type DetectionResult = {
  success: boolean;
  filename: string;

  panel_count: number;
  region_count?: number;

  confidence: number;
  mask_pixel_area: number;
  pixel_area_m2: number;
  detected_area_m2: number;
  capacity_kwp: number;
  daily_energy_kwh: number;

  detected_locations?: DetectedLocation[];

  input_preview: string;
  result_image: string;

  metadata?: {
    crs?: string | null;
    crs_epsg?: number | null;
    gsd_x?: number;
    gsd_y?: number;
    pixel_area_m2?: number;
    bounds?: {
      left: number;
      bottom: number;
      right: number;
      top: number;
    };
  };
};

export default function ReportPage() {
  const [metadata, setMetadata] = useState<GeoTiffAnalysis | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);

  useEffect(() => {
    const storedMetadata = localStorage.getItem("geotiff_analysis");
    const storedDetection = localStorage.getItem("geotiff_detection");

    if (storedMetadata) {
      try {
        setMetadata(JSON.parse(storedMetadata));
      } catch {
        localStorage.removeItem("geotiff_analysis");
      }
    }

    if (storedDetection) {
      try {
        setResult(JSON.parse(storedDetection));
      } catch {
        localStorage.removeItem("geotiff_detection");
      }
    }
  }, []);

  const detectedRegionCount = result?.region_count ?? result?.panel_count ?? 0;

  const locations = useMemo(() => {
    return result?.detected_locations ?? [];
  }, [result]);

  const reportLocations = useMemo(() => {
    return locations;
  }, [locations]);

  if (!metadata || !result) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />

        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          ยังไม่มีข้อมูลสำหรับสร้าง Report
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-slate-500">
          กรุณาอัปโหลด GeoTIFF ตรวจสอบ Metadata และรัน AI Detection ให้เสร็จก่อน
          ระบบจึงจะสามารถสร้างหน้าสรุปผลได้
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/upload"
            className="inline-flex rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            ไปหน้า Upload
          </Link>

          <Link
            href="/analysis"
            className="inline-flex rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ไปหน้า AI Detection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfficialPrintReport
        metadata={metadata}
        result={result}
        detectedRegionCount={detectedRegionCount}
        locations={locations}
        reportLocations={reportLocations}
      />

      <div className="no-print space-y-8">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                <FileText className="h-4 w-4" />
                Solar Roof AI Report
              </div>

              <h1 className="mt-5 text-3xl font-bold text-slate-900">
                รายงานสรุปผลการตรวจจับ Solar Rooftop
              </h1>

              <p className="mt-3 max-w-3xl break-words text-slate-500">
                รายงานนี้สรุปผลจากการวิเคราะห์ไฟล์ GeoTIFF ด้วย YOLO
                Segmentation โดยใช้ข้อมูล Metadata ของภาพเพื่อคำนวณพื้นที่จริง
                และพิกัดตำแหน่งของพื้นที่ที่ตรวจพบ
              </p>

              <p className="mt-3 break-words text-sm text-slate-400">
                ไฟล์ที่วิเคราะห์: {metadata.filename}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            icon={<Layers3 className="h-6 w-6 text-blue-600" />}
            label="Detected Solar Regions"
            value={formatNumber(detectedRegionCount, 0)}
            unit="regions"
          />

          <SummaryCard
            icon={<Gauge className="h-6 w-6 text-emerald-600" />}
            label="Average Confidence"
            value={formatNumber(result.confidence, 2)}
            unit="%"
          />

          <SummaryCard
            icon={<Ruler className="h-6 w-6 text-purple-600" />}
            label="Total Solar Rooftop Area"
            value={formatNumber(result.detected_area_m2, 2)}
            unit="m²"
          />

          <SummaryCard
            icon={<BrainCircuit className="h-6 w-6 text-orange-600" />}
            label="Estimated Capacity"
            value={formatNumber(result.capacity_kwp, 2)}
            unit="kWp"
          />

          <SummaryCard
            icon={<Zap className="h-6 w-6 text-yellow-600" />}
            label="Estimated Energy / Day"
            value={formatNumber(result.daily_energy_kwh, 2)}
            unit="kWh/day"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <InfoSection title="File Information">
            <InfoRow label="Filename" value={metadata.filename} />

            <InfoRow
              label="File Size"
              value={`${formatNumber(metadata.file_size_mb, 2)} MB`}
            />

            <InfoRow
              label="Image Size"
              value={`${formatNumber(
                metadata.metadata.width,
                0,
              )} × ${formatNumber(metadata.metadata.height, 0)} px`}
            />

            <InfoRow
              label="Bands"
              value={
                metadata.metadata.bands
                  ? `${metadata.metadata.bands} bands`
                  : "N/A"
              }
            />

            <InfoRow
              label="Data Type"
              value={metadata.metadata.dtype ?? "N/A"}
            />
          </InfoSection>

          <InfoSection title="GeoTIFF Metadata">
            <InfoRow
              label="CRS"
              value={
                metadata.metadata.crs_epsg
                  ? `EPSG:${metadata.metadata.crs_epsg}`
                  : (metadata.metadata.crs ?? "Unknown")
              }
            />

            <InfoRow
              label="Projected CRS"
              value={
                metadata.metadata.crs_is_projected === undefined
                  ? "N/A"
                  : metadata.metadata.crs_is_projected
                    ? "Yes"
                    : "No"
              }
            />

            <InfoRow
              label="GSD"
              value={`${formatNumber(
                metadata.metadata.gsd_x,
                4,
              )} × ${formatNumber(metadata.metadata.gsd_y, 4)} m/pixel`}
            />

            <InfoRow
              label="Pixel Area"
              value={
                metadata.metadata.pixel_area_m2 !== null
                  ? `${formatNumber(
                      metadata.metadata.pixel_area_m2,
                      4,
                    )} m²/pixel`
                  : "N/A"
              }
            />

            <InfoRow
              label="Tile Size"
              value={`${formatNumber(1024, 0)} × ${formatNumber(1024, 0)} px`}
            />
          </InfoSection>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-slate-700" />

            <h2 className="text-2xl font-bold text-slate-900">
              Detection Result Image
            </h2>
          </div>

          <p className="mb-6 text-sm leading-6 text-slate-500">
            ภาพนี้แสดงผลลัพธ์จาก YOLO Segmentation โดยมีการ overlay mask
            บนบริเวณที่โมเดลตรวจพบว่าเป็น Solar Rooftop
          </p>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <img
              src={result.result_image}
              alt="YOLO Segmentation Result"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6 text-blue-600" />

                <h2 className="text-2xl font-bold text-slate-900">
                  Detected Locations Summary
                </h2>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                ตารางนี้แสดงตำแหน่งของพื้นที่ Solar Rooftop ที่ตรวจพบทั้งหมด
                จากผลการตรวจจับจำนวน {locations.length} regions
              </p>
            </div>

            <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {locations.length} regions
            </div>
          </div>

          {reportLocations.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
              ไม่พบข้อมูล Detected Locations
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Region</th>
                      <th className="px-5 py-4 font-semibold">Confidence</th>
                      <th className="px-5 py-4 font-semibold">Area</th>
                      <th className="px-5 py-4 font-semibold">Center Pixel</th>
                      <th className="px-5 py-4 font-semibold">Latitude</th>
                      <th className="px-5 py-4 font-semibold">Longitude</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {reportLocations.map((location) => (
                      <tr
                        key={location.region_id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          #{location.region_id}
                        </td>

                        <td className="px-5 py-4">
                          <ConfidenceBadge value={location.confidence} />
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {formatNumber(location.area_m2, 2)} m²
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          x={formatNumber(location.center_pixel.x, 2)}
                          <br />
                          y={formatNumber(location.center_pixel.y, 2)}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {location.latitude !== null
                            ? formatNumber(location.latitude, 7)
                            : "N/A"}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {location.longitude !== null
                            ? formatNumber(location.longitude, 7)
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Calculation Summary
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            การคำนวณพื้นที่จริงใช้พื้นที่ของ mask ที่โมเดลตรวจพบคูณกับค่า pixel
            area จาก GeoTIFF Metadata
            จากนั้นนำพื้นที่ที่ได้ไปประมาณกำลังผลิตติดตั้ง
            และพลังงานไฟฟ้าต่อวันเบื้องต้น
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FormulaBox
              label="Area Calculation"
              value={`${formatNumber(
                result.mask_pixel_area,
                2,
              )} px × ${formatNumber(result.pixel_area_m2, 4)} m²/px`}
              result={`${formatNumber(result.detected_area_m2, 2)} m²`}
            />

            <FormulaBox
              label="Capacity Estimate"
              value={`${formatNumber(result.detected_area_m2, 2)} ÷ 5.5`}
              result={`${formatNumber(result.capacity_kwp, 2)} kWp`}
            />

            <FormulaBox
              label="Daily Energy Estimate"
              value={`${formatNumber(result.capacity_kwp, 2)} × 5`}
              result={`${formatNumber(result.daily_energy_kwh, 2)} kWh/day`}
            />
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-800">
            หมายเหตุ: ค่ากำลังผลิตและพลังงานเป็นการประมาณเบื้องต้น
            โดยใช้สมมติฐานพื้นที่ 5.5 m² ต่อ 1 kWp และ specific yield 5
            kWh/kWp/day ไม่ใช่การคำนวณทางวิศวกรรมเต็มรูปแบบ
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไป AI Detection
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>
    </>
  );
}

function OfficialPrintReport({
  metadata,
  result,
  detectedRegionCount,
  locations,
  reportLocations,
}: {
  metadata: GeoTiffAnalysis;
  result: DetectionResult;
  detectedRegionCount: number;
  locations: DetectedLocation[];
  reportLocations: DetectedLocation[];
}) {
  const crsText = metadata.metadata.crs_epsg
    ? `EPSG:${metadata.metadata.crs_epsg}`
    : (metadata.metadata.crs ?? "Unknown");

  const reportDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const imageAreaM2 =
    metadata.metadata.pixel_area_m2 !== null
      ? metadata.metadata.width *
        metadata.metadata.height *
        metadata.metadata.pixel_area_m2
      : null;

  const detectedAreaPercent =
    imageAreaM2 && imageAreaM2 > 0
      ? (result.detected_area_m2 / imageAreaM2) * 100
      : null;

  const confidenceInterpretation =
    result.confidence >= 70
      ? "ค่าความเชื่อมั่นเฉลี่ยอยู่ในระดับค่อนข้างสูง สามารถใช้ประกอบการวิเคราะห์เบื้องต้นได้ดี แต่ยังควรตรวจทานผลลัพธ์จากภาพร่วมด้วย"
      : result.confidence >= 50
        ? "ค่าความเชื่อมั่นเฉลี่ยอยู่ในระดับปานกลาง เหมาะสำหรับใช้เป็นข้อมูลประกอบการสำรวจเบื้องต้น และควรตรวจสอบผลลัพธ์ด้วยสายตาหรือข้อมูลภาคสนามเพิ่มเติม"
        : "ค่าความเชื่อมั่นเฉลี่ยอยู่ในระดับค่อนข้างต่ำ ผลลัพธ์ควรใช้เพื่อการตรวจสอบเบื้องต้นเท่านั้น และควรมีการตรวจทานจากผู้เชี่ยวชาญหรือข้อมูลภาคสนามก่อนนำไปใช้จริง";

  return (
    <article className="official-report">
      <section className="official-cover">
        <div>
          <div className="official-cover-document-type">
            รายงานผลการวิเคราะห์เบื้องต้น
          </div>

          <h1 className="official-cover-title">
            การตรวจจับพื้นที่ Solar Rooftop
            <br />
            จากภาพ GeoTIFF ด้วย YOLO Segmentation
          </h1>

          <div className="official-cover-subtitle">
            ระบบ Solar Roof AI
            <br />
            GeoTIFF Solar Rooftop Detection System
          </div>

          <div className="official-cover-purpose">
            เอกสารฉบับนี้จัดทำขึ้นเพื่อสรุปผลการตรวจจับพื้นที่ Solar Rooftop
            <br />
            สำหรับใช้ประกอบการวิเคราะห์เชิงพื้นที่ การจัดทำรายงาน
            <br />
            และการพิจารณาข้อมูลเบื้องต้นด้านพลังงานแสงอาทิตย์
          </div>

          <div className="official-cover-meta">
            <p>ไฟล์ที่วิเคราะห์: {metadata.filename}</p>
            <p>วันที่จัดทำรายงาน: {reportDate}</p>
          </div>
        </div>
      </section>

      <section className="official-section">
        <h2 className="official-section-title">1. วัตถุประสงค์ของรายงาน</h2>

        <p className="official-paragraph">
          รายงานฉบับนี้มีวัตถุประสงค์เพื่อสรุปผลการวิเคราะห์ภาพ GeoTIFF ด้วยระบบ
          Solar Roof AI ซึ่งใช้โมเดล YOLO Segmentation
          ในการตรวจจับบริเวณที่คาดว่าเป็นพื้นที่ Solar Rooftop
          หรือพื้นที่แผงโซลาร์เซลล์บนหลังคาที่ปรากฏอยู่ในภาพ
          จากนั้นนำผลลัพธ์ที่ตรวจพบไปคำนวณพื้นที่จริงจากข้อมูลเชิงพื้นที่ของ
          GeoTIFF เช่น CRS, GSD และ Pixel Area
        </p>

        <p className="official-paragraph">
          ผลลัพธ์จากรายงานนี้สามารถใช้เป็นข้อมูลประกอบการสำรวจเบื้องต้น
          การจัดทำรายงานเชิงพื้นที่ การวิเคราะห์แนวโน้มการติดตั้ง Solar Rooftop
          และการประเมินกำลังผลิตไฟฟ้าโดยประมาณในระดับต้นแบบ อย่างไรก็ตาม
          รายงานนี้ไม่ใช่เอกสารรับรองผลด้านวิศวกรรม
          และไม่ควรใช้แทนการสำรวจภาคสนามหรือการออกแบบระบบผลิตไฟฟ้าจริง
        </p>
      </section>

      <section className="official-section">
        <h2 className="official-section-title">2. บทสรุปผู้บริหาร</h2>

        <p className="official-paragraph">
          จากการวิเคราะห์ไฟล์ภาพ {metadata.filename}{" "}
          ระบบตรวจพบพื้นที่ที่คาดว่าเป็น Solar Rooftop จำนวน{" "}
          {formatNumber(detectedRegionCount, 0)} regions
          โดยมีค่าความเชื่อมั่นเฉลี่ยของโมเดลเท่ากับ{" "}
          {formatNumber(result.confidence, 2)}% และมีพื้นที่ Solar Rooftop
          รวมที่ตรวจพบประมาณ {formatNumber(result.detected_area_m2, 2)}{" "}
          ตารางเมตร
        </p>

        <p className="official-paragraph">
          เมื่อนำพื้นที่ดังกล่าวมาประมาณกำลังผลิตติดตั้งเบื้องต้น
          โดยใช้สมมติฐานพื้นที่ 5.5 ตารางเมตรต่อ 1 kWp
          ระบบประเมินกำลังผลิตติดตั้งได้ประมาณ{" "}
          {formatNumber(result.capacity_kwp, 2)} kWp
          และประเมินพลังงานไฟฟ้าที่คาดว่าจะผลิตได้ต่อวันประมาณ{" "}
          {formatNumber(result.daily_energy_kwh, 2)} kWh/day
        </p>

        <div className="official-summary-box">
          <p className="official-emphasis">การแปลผลเบื้องต้น:</p>
          <p>{confidenceInterpretation}</p>
        </div>

        <table className="official-table">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>ลำดับ</th>
              <th>รายการ</th>
              <th style={{ width: "35%" }}>ผลลัพธ์</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={{ textAlign: "center" }}>1</td>
              <td>จำนวนพื้นที่ Solar Rooftop ที่ตรวจพบ</td>
              <td>{formatNumber(detectedRegionCount, 0)} regions</td>
            </tr>

            <tr>
              <td style={{ textAlign: "center" }}>2</td>
              <td>ค่าความเชื่อมั่นเฉลี่ยของโมเดล</td>
              <td>{formatNumber(result.confidence, 2)}%</td>
            </tr>

            <tr>
              <td style={{ textAlign: "center" }}>3</td>
              <td>พื้นที่ Solar Rooftop รวมที่ตรวจพบ</td>
              <td>{formatNumber(result.detected_area_m2, 2)} ตารางเมตร</td>
            </tr>

            <tr>
              <td style={{ textAlign: "center" }}>4</td>
              <td>กำลังผลิตติดตั้งโดยประมาณ</td>
              <td>{formatNumber(result.capacity_kwp, 2)} kWp</td>
            </tr>

            <tr>
              <td style={{ textAlign: "center" }}>5</td>
              <td>พลังงานไฟฟ้าที่คาดว่าจะผลิตได้ต่อวัน</td>
              <td>{formatNumber(result.daily_energy_kwh, 2)} kWh/day</td>
            </tr>

            <tr>
              <td style={{ textAlign: "center" }}>6</td>
              <td>สัดส่วนพื้นที่ Solar Rooftop ต่อพื้นที่ภาพทั้งหมด</td>
              <td>
                {detectedAreaPercent !== null
                  ? `${formatNumber(detectedAreaPercent, 4)}%`
                  : "N/A"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="official-section">
        <h2 className="official-section-title">
          3. ข้อมูลไฟล์และ Metadata ของ GeoTIFF
        </h2>

        <p className="official-paragraph">
          ข้อมูล Metadata ของไฟล์ GeoTIFF มีความสำคัญต่อการวิเคราะห์เชิงพื้นที่
          เนื่องจากระบบต้องใช้ข้อมูลขนาดภาพ ระบบพิกัดอ้างอิง
          ความละเอียดเชิงพื้นที่ และพื้นที่ต่อหนึ่ง pixel เพื่อแปลงผลลัพธ์จาก
          pixel coordinate ให้เป็นพื้นที่จริงและพิกัดทางภูมิศาสตร์
        </p>

        <table className="official-table">
          <tbody>
            <tr>
              <th style={{ width: "35%" }}>ชื่อไฟล์</th>
              <td>{metadata.filename}</td>
            </tr>

            <tr>
              <th>ขนาดไฟล์</th>
              <td>{formatNumber(metadata.file_size_mb, 2)} MB</td>
            </tr>

            <tr>
              <th>ขนาดภาพ</th>
              <td>
                {formatNumber(metadata.metadata.width, 0)} ×{" "}
                {formatNumber(metadata.metadata.height, 0)} pixels
              </td>
            </tr>

            <tr>
              <th>จำนวน Band</th>
              <td>
                {metadata.metadata.bands
                  ? `${metadata.metadata.bands} bands`
                  : "N/A"}
              </td>
            </tr>

            <tr>
              <th>ชนิดข้อมูลภาพ</th>
              <td>{metadata.metadata.dtype ?? "N/A"}</td>
            </tr>

            <tr>
              <th>ระบบพิกัดอ้างอิง</th>
              <td>{crsText}</td>
            </tr>

            <tr>
              <th>ประเภท CRS</th>
              <td>
                {metadata.metadata.crs_is_projected === undefined
                  ? "N/A"
                  : metadata.metadata.crs_is_projected
                    ? "Projected CRS"
                    : "Geographic CRS"}
              </td>
            </tr>

            <tr>
              <th>Ground Sampling Distance</th>
              <td>
                {formatNumber(metadata.metadata.gsd_x, 4)} ×{" "}
                {formatNumber(metadata.metadata.gsd_y, 4)} m/pixel
              </td>
            </tr>

            <tr>
              <th>Pixel Area</th>
              <td>
                {metadata.metadata.pixel_area_m2 !== null
                  ? `${formatNumber(
                      metadata.metadata.pixel_area_m2,
                      4,
                    )} m²/pixel`
                  : "N/A"}
              </td>
            </tr>

            <tr>
              <th>พื้นที่ภาพโดยประมาณ</th>
              <td>
                {imageAreaM2 !== null
                  ? `${formatNumber(imageAreaM2, 2)} ตารางเมตร`
                  : "N/A"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="official-section">
        <h2 className="official-section-title">
          4. วิธีการวิเคราะห์และสมมติฐานที่ใช้
        </h2>

        <p className="official-paragraph">
          กระบวนการวิเคราะห์เริ่มจากการรับไฟล์ภาพ GeoTIFF และตรวจสอบ Metadata
          ที่จำเป็น เช่น CRS, GSD, Pixel Area และจำนวน Band
          จากนั้นระบบนำภาพเข้าสู่กระบวนการตรวจจับด้วยโมเดล YOLO Segmentation
          เพื่อระบุขอบเขตของบริเวณที่คาดว่าเป็น Solar Rooftop ในรูปแบบของ mask
          หรือพื้นที่ที่โมเดลตรวจพบ
        </p>

        <p className="official-paragraph">
          พื้นที่จริงของ Solar Rooftop คำนวณจากจำนวน pixel ภายใน mask คูณกับค่า
          Pixel Area ของไฟล์ GeoTIFF
          จากนั้นนำพื้นที่ที่ได้ไปประมาณกำลังผลิตติดตั้งและพลังงานไฟฟ้าต่อวัน
          โดยใช้สมมติฐานเบื้องต้นดังต่อไปนี้
        </p>

        <ul className="official-list">
          <li>พื้นที่ติดตั้งโดยประมาณ 5.5 ตารางเมตร ต่อ 1 kWp</li>
          <li>ค่า specific yield โดยประมาณ 5 kWh/kWp/day</li>
          <li>
            Region หมายถึงพื้นที่หรือ mask ที่โมเดลตรวจพบ
            ไม่ใช่จำนวนแผงโซลาร์เซลล์จริงแบบแยกแผง
          </li>
          <li>
            ผลลัพธ์เป็นการวิเคราะห์เบื้องต้น
            ไม่ใช่ผลการออกแบบระบบผลิตไฟฟ้าทางวิศวกรรม
          </li>
        </ul>
      </section>

      <section className="official-section official-page-break">
        <h2 className="official-section-title">5. ภาพผลลัพธ์จากการตรวจจับ</h2>

        <p className="official-paragraph">
          ภาพผลลัพธ์ต่อไปนี้เป็นภาพที่ผ่านกระบวนการตรวจจับด้วยโมเดล YOLO
          Segmentation โดยระบบแสดงบริเวณที่โมเดลตรวจพบว่าเป็นพื้นที่ Solar
          Rooftop ในรูปแบบของ mask ซ้อนทับบนภาพต้นฉบับ
          เพื่อให้ผู้ใช้สามารถตรวจสอบตำแหน่งและลักษณะของผลลัพธ์ได้ด้วยสายตา
        </p>

        <div className="official-image-wrapper">
          <img
            src={result.result_image}
            alt="YOLO Segmentation Result"
            className="official-image"
          />

          <p className="official-caption">
            ภาพที่ 1 ผลการตรวจจับพื้นที่ Solar Rooftop ด้วย YOLO Segmentation
          </p>
        </div>
      </section>

      <section className="official-section">
        <h2 className="official-section-title">
          6. สรุปตำแหน่งพื้นที่ที่ตรวจพบ
        </h2>

        <p className="official-paragraph">
          ตารางต่อไปนี้แสดงตำแหน่งของพื้นที่ Solar Rooftop ที่ตรวจพบทั้งหมด
          จากผลการตรวจจับจำนวน {formatNumber(locations.length, 0)} regions
          พร้อมค่าความเชื่อมั่น พื้นที่ และพิกัดละติจูด/ลองจิจูด
          เพื่อใช้ประกอบการตรวจสอบตำแหน่งหรือการนำไปวิเคราะห์เชิงพื้นที่ต่อไป
        </p>

        {reportLocations.length === 0 ? (
          <p>ไม่พบข้อมูลตำแหน่งของพื้นที่ที่ตรวจจับได้</p>
        ) : (
          <table className="official-table official-location-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Confidence</th>
                <th>Area</th>
                <th>Center Pixel</th>
                <th>Latitude</th>
                <th>Longitude</th>
              </tr>
            </thead>

            <tbody>
              {reportLocations.map((location) => (
                <tr key={location.region_id}>
                  <td style={{ textAlign: "center" }}>#{location.region_id}</td>

                  <td style={{ textAlign: "center" }}>
                    {formatNumber(location.confidence, 2)}%
                  </td>

                  <td style={{ textAlign: "right" }}>
                    {formatNumber(location.area_m2, 2)} m²
                  </td>

                  <td>
                    x={formatNumber(location.center_pixel.x, 2)}, y=
                    {formatNumber(location.center_pixel.y, 2)}
                  </td>

                  <td style={{ textAlign: "right" }}>
                    {location.latitude !== null
                      ? formatNumber(location.latitude, 7)
                      : "N/A"}
                  </td>

                  <td style={{ textAlign: "right" }}>
                    {location.longitude !== null
                      ? formatNumber(location.longitude, 7)
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="official-section">
        <h2 className="official-section-title">
          7. วิธีการคำนวณพื้นที่และพลังงาน
        </h2>

        <table className="official-table">
          <thead>
            <tr>
              <th>รายการคำนวณ</th>
              <th>สูตรหรือสมมติฐานที่ใช้</th>
              <th>ผลลัพธ์</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>พื้นที่จริงของ Solar Rooftop</td>
              <td>
                Mask Pixel Area × Pixel Area ={" "}
                {formatNumber(result.mask_pixel_area, 2)} ×{" "}
                {formatNumber(result.pixel_area_m2, 4)}
              </td>
              <td>{formatNumber(result.detected_area_m2, 2)} m²</td>
            </tr>

            <tr>
              <td>กำลังผลิตติดตั้งโดยประมาณ</td>
              <td>Detected Area ÷ 5.5 m²/kWp</td>
              <td>{formatNumber(result.capacity_kwp, 2)} kWp</td>
            </tr>

            <tr>
              <td>พลังงานไฟฟ้าต่อวันโดยประมาณ</td>
              <td>Capacity × 5 kWh/kWp/day</td>
              <td>{formatNumber(result.daily_energy_kwh, 2)} kWh/day</td>
            </tr>
          </tbody>
        </table>

        <div className="official-note">
          หมายเหตุ:
          ค่ากำลังผลิตติดตั้งและพลังงานไฟฟ้าต่อวันเป็นการประมาณเบื้องต้น
          โดยอาศัยสมมติฐานพื้นที่ 5.5 ตารางเมตรต่อ 1 kWp และค่า specific yield 5
          kWh/kWp/day ผลลัพธ์นี้ไม่ใช่การประเมินทางวิศวกรรมเต็มรูปแบบ
          และไม่ควรใช้แทนการสำรวจภาคสนามหรือการออกแบบระบบผลิตไฟฟ้าจริง
        </div>
      </section>

      <section className="official-section">
        <h2 className="official-section-title">
          8. การนำผลลัพธ์ไปใช้ประกอบการวิเคราะห์
        </h2>

        <p className="official-paragraph">
          ผลลัพธ์จากรายงานนี้เหมาะสำหรับใช้ประกอบการวิเคราะห์เบื้องต้น เช่น
          การระบุตำแหน่งพื้นที่ Solar Rooftop ที่ปรากฏอยู่ในภาพ
          การประเมินพื้นที่รวมของ Solar Rooftop ในบริเวณศึกษา
          การจัดทำตารางสรุปตำแหน่งที่ตรวจพบ
          และการประมาณกำลังผลิตไฟฟ้าในระดับแนวคิด
        </p>

        <p className="official-paragraph">
          หากต้องการนำผลลัพธ์ไปใช้ประกอบการตัดสินใจในงานจริง
          ควรตรวจสอบผลลัพธ์ร่วมกับภาพต้นฉบับ ข้อมูลพื้นที่จริง ภาพถ่ายภาคสนาม
          หรือข้อมูลจากหน่วยงานที่เกี่ยวข้อง
          เพื่อยืนยันว่าบริเวณที่ระบบตรวจพบเป็น Solar Rooftop จริง
          และเพื่อประเมินความถูกต้องของพื้นที่ที่ตรวจพบเพิ่มเติม
        </p>
      </section>

      <section className="official-section">
        <h2 className="official-section-title">9. ข้อจำกัดและข้อควรระวัง</h2>

        <p className="official-paragraph">
          ผลลัพธ์จากระบบขึ้นอยู่กับคุณภาพของภาพ GeoTIFF ความละเอียดเชิงพื้นที่
          ความถูกต้องของ Metadata และประสิทธิภาพของโมเดล YOLO Segmentation
          ในกรณีที่ภาพมีความละเอียดต่ำ มีเงาบดบัง
          มีหลังคาที่มีลักษณะคล้ายแผงโซลาร์เซลล์ หรือมีวัตถุขนาดเล็กมาก
          ผลการตรวจจับอาจมีความคลาดเคลื่อนได้
        </p>

        <p className="official-paragraph">
          นอกจากนี้ ค่า region ที่แสดงในรายงานหมายถึงบริเวณหรือ mask
          ที่โมเดลตรวจพบ ไม่ได้หมายถึงจำนวนแผงโซลาร์เซลล์จริงแบบแยกแผง ดังนั้น
          หากต้องการนับจำนวนแผงจริง จำเป็นต้องใช้กระบวนการตรวจจับ หรือ
          annotation ที่ละเอียดกว่าในระดับรายแผง
        </p>

        <div className="official-signature">
          <p>ผู้จัดทำรายงาน</p>

          <p style={{ marginTop: "12mm" }}>
            <span className="official-signature-line"></span>
          </p>

          <p style={{ marginTop: "2mm" }}>วันที่ {reportDate}</p>
        </div>
      </section>
    </article>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
        {icon}
      </div>

      <div className="mt-5 text-sm font-medium text-slate-500">{label}</div>

      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>

      <div className="mt-1 text-sm text-slate-500">{unit}</div>
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>

      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 md:flex-row md:items-start md:justify-between">
      <div className="text-sm font-medium text-slate-500">{label}</div>

      <div className="break-words text-sm font-semibold text-slate-900 md:max-w-[65%] md:text-right">
        {value}
      </div>
    </div>
  );
}

function FormulaBox({
  label,
  value,
  result,
}: {
  label: string;
  value: string;
  result: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-sm font-semibold text-slate-500">{label}</div>

      <div className="mt-3 break-words text-sm text-slate-600">{value}</div>

      <div className="mt-3 break-words text-xl font-bold text-slate-900">
        {result}
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const badgeClass =
    value >= 70
      ? "bg-emerald-50 text-emerald-700"
      : value >= 40
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}
    >
      {formatNumber(value, 2)}%
    </span>
  );
}

function formatNumber(value: number, decimals = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
