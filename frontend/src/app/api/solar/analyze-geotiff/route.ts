const backendUrl = (process.env.SOLAR_BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type");
  if (!request.body || !contentType?.toLowerCase().startsWith("multipart/form-data")) {
    return Response.json({ detail: "กรุณาส่งไฟล์ GeoTIFF แบบ multipart" }, { status: 400 });
  }

  const options: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: { "content-type": contentType },
    body: request.body,
    duplex: "half",
    signal: request.signal,
    cache: "no-store",
  };

  try {
    const response = await fetch(`${backendUrl}/analyze-geotiff`, options);
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "ส่งไฟล์ไปยังระบบวิเคราะห์ไม่ได้ กรุณาลองใหม่" }, { status: 502 });
  }
}
