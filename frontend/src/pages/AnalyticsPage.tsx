import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { experimentsApi, analyticsApi } from "../services/api"
import { BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts"

export function AnalyticsPage() {
  const queryClient = useQueryClient()
  const [selectedExpId, setSelectedExpId] = useState<number | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const { data: experiments } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => experimentsApi.list({ page_size: "50" }),
  })

  const analysisMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.runAnalysis(id),
    onSuccess: (data) => setAnalysisResult(data),
  })

  const runExps = experiments?.experiments?.filter((e: any) => e.status === "running" || e.status === "completed") || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Run statistical analysis on experiment data</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-slate-700">Select Experiment:</label>
          <select value={selectedExpId || ""} onChange={(e) => { setSelectedExpId(Number(e.target.value)); setAnalysisResult(null) }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="">Choose experiment...</option>
            {runExps.map((exp: any) => (
              <option key={exp.id} value={exp.id}>{exp.name} ({exp.status})</option>
            ))}
          </select>
          <button onClick={() => selectedExpId && analysisMutation.mutate(selectedExpId)} disabled={!selectedExpId || analysisMutation.isPending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
            {analysisMutation.isPending ? "Running..." : "Run Analysis"}
          </button>
        </div>

        {analysisMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4">
            {(analysisMutation.error as Error)?.message}
          </div>
        )}
      </div>

      {analysisResult && (
        <div className="space-y-6">
          {/* Key Results */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Control</div>
              <div className="text-xl font-bold text-slate-900">{analysisResult.control?.mean?.toFixed(4)}</div>
              <div className="text-xs text-slate-400">n={analysisResult.control?.sample_size?.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Treatment</div>
              <div className="text-xl font-bold text-slate-900">{analysisResult.treatment?.mean?.toFixed(4)}</div>
              <div className="text-xs text-slate-400">n={analysisResult.treatment?.sample_size?.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Uplift</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${analysisResult.uplift?.relative >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {analysisResult.uplift?.relative >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {analysisResult.uplift?.relative >= 0 ? "+" : ""}{analysisResult.uplift?.relative?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Significance</div>
              <div className="text-xl font-bold text-slate-900">p={analysisResult.statistical?.p_value?.toFixed(4)}</div>
              <div className="text-xs mt-1">
                {analysisResult.statistical?.is_significant ? <span className="text-emerald-600 font-medium">✓ Significant</span> : <span className="text-slate-400">Not significant</span>}
              </div>
            </div>
          </div>

          {/* Statistical Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Statistical Test</h3>
            <div className="text-sm text-slate-600 mb-2"><strong>Test:</strong> {analysisResult.statistical?.test_used || "—"}</div>
            <div className="text-sm text-slate-600 mb-2"><strong>Confidence Level:</strong> {analysisResult.statistical?.confidence_level ? `${(analysisResult.statistical.confidence_level * 100).toFixed(0)}%` : "—"}</div>
            <div className="text-sm text-slate-600 mb-2"><strong>Confidence Interval:</strong> [{analysisResult.uplift?.confidence_interval?.lower?.toFixed(4)}, {analysisResult.uplift?.confidence_interval?.upper?.toFixed(4)}]</div>
            <div className="text-sm text-slate-600 mb-2"><strong>Statistical Power:</strong> {analysisResult.statistical?.statistical_power ? `${(analysisResult.statistical.statistical_power * 100).toFixed(1)}%` : "—"}</div>
            {analysisResult.statistical?.test_explanation && <div className="text-xs text-slate-500 mt-2 p-3 bg-slate-50 rounded-lg">{analysisResult.statistical.test_explanation}</div>}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Control", value: analysisResult.control?.mean || 0 },
                { name: "Treatment", value: analysisResult.treatment?.mean || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SRM */}
          {analysisResult.srm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Sample Ratio Mismatch</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Expected:</span> <span className="font-medium ml-1">{analysisResult.srm.expected?.control}% / {analysisResult.srm.expected?.treatment}%</span></div>
                <div><span className="text-slate-500">Observed:</span> <span className="font-medium ml-1">{analysisResult.srm.observed?.control}% / {analysisResult.srm.observed?.treatment}%</span></div>
                <div><span className="text-slate-500">Chi-Square:</span> <span className="font-medium ml-1">{analysisResult.srm.chi_square}</span></div>
                <div><span className="text-slate-500">SRM Detected:</span> <span className={`font-medium ml-1 ${analysisResult.srm.has_srm ? "text-red-600" : "text-emerald-600"}`}>{analysisResult.srm.has_srm ? "Yes" : "No"}</span></div>
              </div>
              {analysisResult.srm.has_srm && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg text-xs text-red-700">{analysisResult.srm.recommendation}</div>
              )}
            </div>
          )}

          {/* Health */}
          {analysisResult.health && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Health Score: <span className={analysisResult.health.score >= 90 ? "text-emerald-600" : analysisResult.health.score >= 70 ? "text-amber-600" : "text-red-600"}>{analysisResult.health.score}/100</span>
                <span className="text-slate-400 font-normal ml-2">— {analysisResult.health.status}</span>
              </h3>
              <div className="space-y-2">
                {analysisResult.health.checks?.map((check: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span>{check.status === "healthy" ? "✅" : check.status === "warning" ? "⚠️" : "❌"}</span>
                    <span className="text-slate-700"><strong>{check.name}:</strong> {check.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {analysisResult.insights?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Insights</h3>
              <div className="space-y-3">
                {analysisResult.insights.map((ins: any, i: number) => (
                  <div key={i} className={`p-4 rounded-lg border ${ins.severity === "positive" ? "bg-emerald-50 border-emerald-200" : ins.severity === "critical" ? "bg-red-50 border-red-200" : ins.severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                    <div className="text-sm font-medium text-slate-900">{ins.title}</div>
                    <div className="text-xs text-slate-600 mt-1">{ins.description}</div>
                    {ins.recommendation && <div className="text-xs text-slate-500 mt-2"><em>→ {ins.recommendation}</em></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
