import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { analyticsApi } from "../services/api"
import { useAnalysisContext } from "../contexts/AnalysisContext"
import { Users, Database, ArrowRight, AlertCircle } from "lucide-react"

export function SegmentsPage() {
  const navigate = useNavigate()
  const { activeExperimentId, activeDataset, hasContext, hasDataset, hasExperiment } = useAnalysisContext()

  const { data: segments, isLoading } = useQuery({
    queryKey: ["segments", activeExperimentId],
    queryFn: () => analyticsApi.segments(activeExperimentId!),
    enabled: !!activeExperimentId && hasContext,
  })

  if (!hasContext || !hasDataset) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Segment Analysis</h1>
          <p className="text-slate-500 text-sm mt-1">Analyze experiment results across user segments</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Database className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No dataset selected</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Select a dataset from Data Lab to view segment analysis.</p>
          <button onClick={() => navigate("/data-lab")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 mx-auto">
            Go to Data Lab <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (hasDataset && !hasExperiment) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Segment Analysis</h1>
          <p className="text-slate-500 text-sm mt-1">Segment breakdown for {activeDataset?.original_filename}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
          <p className="text-slate-500 font-medium">No experiment attached to this dataset</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Attach this dataset to an experiment to view segment analysis.</p>
          <button onClick={() => navigate("/experiments")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 mx-auto">
            Go to Experiments <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Segment Analysis</h1>
        <p className="text-slate-500 text-sm mt-1">Segment breakdown for {activeDataset?.original_filename}</p>
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
      ) : !isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No segment data available</p>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Segment analysis requires columns mapped as &quot;segment&quot; in your dataset (e.g., country, device, channel).
            Run analysis first to generate segment results.
          </p>
        </div>
      ) : null}
    </div>
  )
}
