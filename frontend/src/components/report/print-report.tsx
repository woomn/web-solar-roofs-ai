import Image from "next/image";

import { outputUrl } from "@/lib/analysis/api";
import { areaFormula, formatAnalysisDate, formatNumber } from "@/lib/analysis/formatters";
import type { DetectedLocation, DetectionResult, GeoTiffAnalysis } from "@/lib/analysis/types";

export default function PrintReport({
  metadata,
  result,
  detectedRegionCount,
  locations,
  analyzedAt,
  imageStatus,
}: {
  metadata: GeoTiffAnalysis;
  result: DetectionResult;
  detectedRegionCount: number;
  locations: DetectedLocation[];
  analyzedAt: string | null;
  imageStatus: "loading" | "ready" | "error";
}) {
  const crsText = metadata.metadata.crs_epsg
    ? `EPSG:${metadata.metadata.crs_epsg}`
    : (metadata.metadata.crs ?? "Unknown");

  const reportDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const imageAreaM2 = metadata.metadata.image_area_m2 ?? (
    metadata.metadata.pixel_area_m2 === null ? null :
      metadata.metadata.width * metadata.metadata.height * metadata.metadata.pixel_area_m2
  );

  const detectedAreaPercent =
    imageAreaM2 && imageAreaM2 > 0
      ? (result.detected_area_m2 / imageAreaM2) * 100
      : null;

  const confidenceInterpretation = detectedRegionCount === 0
    ? "โมเดลไม่พบผลที่ผ่านเกณฑ์ในภาพนี้ หากพื้นที่เป้าหมายมีแผงที่ทราบอยู่แล้ว ควรตรวจความละเอียดของภาพและขอบเขตที่ถ่าย"
    : "คะแนนโมเดลใช้ประกอบการตรวจทาน ควรพิจารณาภาพผลตรวจจับและข้อมูลพื้นที่ร่วมด้วย";

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
            <p>วิเคราะห์เมื่อ {formatAnalysisDate(analyzedAt)}</p>
            <p>ออกรายงานวันที่ {reportDate}</p>
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
        <h2 className="official-section-title">2. บทสรุป</h2>

        <p className="official-paragraph">
          จากการวิเคราะห์ไฟล์ภาพ {metadata.filename}{" "}
          ระบบตรวจพบพื้นที่ที่คาดว่าเป็น Solar Rooftop จำนวน{" "}
          {formatNumber(detectedRegionCount, 0)} regions
          {detectedRegionCount > 0 && ` คะแนนโมเดลเฉลี่ย ${formatNumber(result.confidence)}%`}
          {" "}พื้นที่รวมที่ตรวจพบประมาณ {formatNumber(result.detected_area_m2, 2)}{" "}
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
              <td>{detectedRegionCount ? `${formatNumber(result.confidence)}%` : "—"}</td>
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
          วิธีคำนวณพื้นที่คือ {areaFormula(result)} จากนั้นนำพื้นที่ไปประมาณกำลังติดตั้งและพลังงานไฟฟ้าต่อวัน
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
          {imageStatus === "ready" ? (
            <Image unoptimized loading="eager" src={outputUrl(result.result_image)}
              alt="ภาพแสดงขอบเขตที่โมเดลตรวจพบ"
              width={metadata.metadata.width} height={metadata.metadata.height}
              className="official-image" />
          ) : <p>ไม่มีภาพผลตรวจจับสำหรับพิมพ์</p>}

          <p className="official-caption">
            ภาพที่ 1 ผลการตรวจจับพื้นที่ Solar Rooftop ด้วย YOLO Segmentation
          </p>
        </div>
      </section>

      <section className="official-section official-location-section">
        <h2 className="official-section-title">
          6. สรุปตำแหน่งพื้นที่ที่ตรวจพบ
        </h2>

        <p className="official-paragraph">
          ตารางต่อไปนี้แสดงตำแหน่งของพื้นที่ Solar Rooftop ที่ตรวจพบทั้งหมด
          จากผลการตรวจจับจำนวน {formatNumber(locations.length, 0)} regions
          พร้อมค่าความเชื่อมั่น พื้นที่ และพิกัดละติจูด/ลองจิจูด
          เพื่อใช้ประกอบการตรวจสอบตำแหน่งหรือการนำไปวิเคราะห์เชิงพื้นที่ต่อไป
        </p>

        {locations.length === 0 ? (
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
              {locations.map((location) => (
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
                {areaFormula(result)}
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
