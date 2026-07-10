import ComingSoonPage from "@/components/ui/coming-soon-page";

export default function SettingsPage() {
  return (
    <ComingSoonPage
      badge="Configuration"
      title="ตั้งค่าการวิเคราะห์ของระบบ"
      description="หน้านี้จะใช้สำหรับจัดการค่าพารามิเตอร์ของระบบ GeoTIFF Processing, AI Detection และ Energy Estimation"
      items={[
        "ตั้งค่า Confidence Threshold ของ YOLO Detection",
        "ตั้งค่า Tile Size สำหรับ crop ภาพ เช่น 1024×1024 px",
        "กำหนดช่วง GSD ที่ระบบยอมรับ เช่น 0.3–0.6 m/pixel",
        "กำหนดขนาดไฟล์ GeoTIFF สูงสุด เช่น 5000×5000 px",
        "ตั้งค่าสมมติฐานด้านพลังงาน เช่น m² ต่อ kWp",
        "ตั้งค่า Specific Yield เช่น 5 kWh/kWp/day",
      ]}
    />
  );
}
