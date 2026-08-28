import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { experimentsApi, analyticsApi } from "../services/api"
import { Users } from "lucide-react"

export function SegmentsPage() {
  const [selectedExpId, setSelectedExpId] = useState<number | null>(null)

  const { data: experiments } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => experimentsApi.list({ page_size: "50" }),
  })

  const { data: segments, isLoading } = useQuery({
    queryKey: ["segments", selectedExpId],
    queryFn: () => analyticsApi.segments(selectedExpId!),
    enabled: !!selectedExpId,
  })

  const runExps = experiments?.experiments?.filter((e: any) => e.status === "running" || e.status === "completed") || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Segment Analysis</h1>
        <p className="text-slate-500 text-sm mt-1">Analyze experiment results across user segments</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Experiment:</label>
          <select value={selectedExpId || ""} onChange={(e) => setSelectedExpId(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="">Choose experiment...</option>
            {runExps.map((exp: any) => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
          </select>
        </div>
      </div>

      {segments && segments.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-medium text-slate-600">Segment</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Value</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Control (n)</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Treatment (n)</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Control Mean</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Treatment Mean</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Uplift</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">P-Value</th>
                <th className="text-center px-5 py-3 font-medium text-slate-600">Significant</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{s.segment_name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.segment_value}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{s.control_sample_size?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{s.treatment_sample_size?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{s.control_mean?.toFixed(4)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{s.treatment_mean?.toFixed(4)}</td>
                  <td className={`px-5 py-3 text-right font-medium ${s.relative_uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {s.relative_uplift >= 0 ? "+" : ""}{s.relative_uplift?.toFixed(1)}%
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{s.p_value?.toFixed(4) || "—"}</td>
                  <td className="px-5 py-3 text-center">{s.is_significant ? "✅" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedExpId && !isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No segment data. Run analysis with mapped segment columns.</p>
        </div>
      ) : !selectedExpId ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Select an experiment to view segment analysis</p>
        </div>
      ) : null}
    </div>
  )
}
