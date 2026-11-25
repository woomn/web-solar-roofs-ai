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
        <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row print:block print:min-h-0">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col print:block">
            <Navbar />

            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 print:p-0">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
