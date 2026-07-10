import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "Solar Roof AI",
  description: "GeoTIFF Solar Rooftop Detection System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="bg-slate-50 text-slate-900">
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <Navbar />

            <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
