import ComingSoonPage from "@/components/ui/coming-soon-page";

export default function ReportPage() {
  return (
    <ComingSoonPage
      badge="Analysis Report"
      title="รายงานสรุปการวิเคราะห์ Solar Rooftop"
      description="หน้านี้จะใช้สำหรับสรุปผลการวิเคราะห์ในรูปแบบรายงาน เพื่อให้ผู้ใช้สามารถตรวจสอบและนำผลลัพธ์ไปใช้งานต่อได้"
      items={[
        "ข้อมูลไฟล์ GeoTIFF ที่อัปโหลด เช่น filename, CRS, GSD และ Pixel Size",
        "ภาพผลลัพธ์ที่มี mask ของ Solar Rooftop จาก YOLO Segmentation",
        "ตารางสรุปพื้นที่ที่ตรวจพบ กำลังผลิตโดยประมาณ และพลังงานต่อวัน",
        "รายละเอียดสูตรคำนวณและสมมติฐาน เช่น 5.5 m² ต่อ 1 kWp",
        "ส่วนอ้างอิงหรือหมายเหตุว่าเป็นค่าประมาณเบื้องต้น",
        "ปุ่ม Download Report หรือ Export PDF ในเวอร์ชันถัดไป",
      ]}
    />
  );
}
