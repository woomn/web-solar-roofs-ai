import type { NextConfig } from "next";

const backendUrl = (process.env.SOLAR_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/solar/requirements", destination: `${backendUrl}/requirements` },
      { source: "/api/solar/detect-geotiff", destination: `${backendUrl}/detect-geotiff` },
      { source: "/api/solar/outputs/:file", destination: `${backendUrl}/outputs/:file` },
    ];
  },
};

export default nextConfig;
