import ComingSoonPage from "@/components/ui/coming-soon-page";

export default function ResultsPage() {
  return (
    <ComingSoonPage
      badge="Results"
      title="ผลการวิเคราะห์ Solar Rooftop"
      description="หน้านี้จะใช้สำหรับดูผลลัพธ์ล่าสุดจากการตรวจจับ Solar Rooftop พร้อมภาพผลลัพธ์และค่าคำนวณสำคัญ"
      items={[
        "แสดงภาพ GeoTIFF ก่อนตรวจจับและภาพผลลัพธ์หลัง YOLO Segmentation",
        "แสดงจำนวนพื้นที่ Solar Rooftop ที่ตรวจพบ",
        "แสดงค่า Average Confidence ของผลการตรวจจับ",
        "แสดง Solar Rooftop Area ในหน่วยตารางเมตร",
        "แสดง Estimated Capacity และ Estimated Energy / Day",
        "แสดง Calculation Summary และสมมติฐานที่ใช้คำนวณ",
      ]}
    />
  );
}
