import { MapPin } from "lucide-react";

import type { RegionControls } from "@/components/analysis/detection-image-viewer";
import { formatNumber } from "@/lib/analysis/formatters";

export default function ReportLocationTable({ locations, selectedId, viewerId, selectRegion }: RegionControls) {
  if (!locations.length) return null;

  return (
    <details className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <summary className="cursor-pointer font-semibold text-slate-950">ตารางพิกัดและคะแนนโมเดล · {formatNumber(locations.length, 0)} บริเวณ</summary>
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">บริเวณ</th>
                <th className="px-5 py-4 font-semibold">คะแนนโมเดล</th>
                <th className="px-5 py-4 font-semibold">พื้นที่</th>
                <th className="px-5 py-4 font-semibold">จุดกึ่งกลางภาพ</th>
                <th className="px-5 py-4 font-semibold">ละติจูด</th>
                <th className="px-5 py-4 font-semibold">ลองจิจูด</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {locations.map((location) => (
                <tr
                  key={location.region_id}
                  className={location.region_id === selectedId ? "bg-teal-50" : "transition hover:bg-slate-50"}
                >
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    <button
                      type="button"
                      onClick={(event) => selectRegion(location.region_id, event.currentTarget)}
                      aria-controls={viewerId}
                      aria-label={`ดูบริเวณ #${location.region_id} ในภาพ`}
                      aria-pressed={location.region_id === selectedId}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700 aria-pressed:bg-teal-100 aria-pressed:text-teal-950"
                    >
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      #{location.region_id}
                    </button>
                  </td>

                  <td className="px-5 py-4">
                    <ConfidenceBadge value={location.confidence} />
                  </td>

                  <td className="px-5 py-4 text-slate-700">
                    {formatNumber(location.area_m2, 2)} ตร.ม.
                  </td>

                  <td className="px-5 py-4 text-slate-700">
                    x={formatNumber(location.center_pixel.x, 2)}
                    <br />
                    y={formatNumber(location.center_pixel.y, 2)}
                  </td>

                  <td className="px-5 py-4 text-slate-700">
                    {location.latitude !== null
                      ? formatNumber(location.latitude, 7)
                      : "—"}
                  </td>

                  <td className="px-5 py-4 text-slate-700">
                    {location.longitude !== null
                      ? formatNumber(location.longitude, 7)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
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
