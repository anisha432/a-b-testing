import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { experimentsApi, analyticsApi } from "../services/api"
import { useAnalysisContext } from "../contexts/AnalysisContext"
import { BarChart3, ArrowUpRight, ArrowDownRight, AlertCircle, Database, ArrowRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { ErrorBoundary } from "../components/ErrorBoundary"

export function AnalyticsPage() {
  const navigate = useNavigate()
  const { activeExperimentId, activeDataset, hasContext, hasDataset, hasExperiment } = useAnalysisContext()
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const expId = activeExperimentId

  // Fetch persisted results from DB
  const { data: persistedResults } = useQuery({
    queryKey: ["results", expId],
    queryFn: () => analyticsApi.results(expId!),
    enabled: !!expId && hasContext,
  })

  // Map persisted (flat) result to the nested format the UI expects
  const mapPersisted = (r: any) => ({
    metric: r.metric_name,
    control: { mean: r.control_mean, sample_size: r.control_sample_size, std: r.control_std },
    treatment: { mean: r.treatment_mean, sample_size: r.treatment_sample_size, std: r.treatment_std },
    uplift: {
      relative: r.relative_uplift,
      absolute: r.absolute_difference,
      confidence_interval: { lower: r.confidence_interval_lower, upper: r.confidence_interval_upper },
    },
    statistical: {
      p_value: r.p_value,
      confidence_level: r.confidence_level,
      is_significant: !!r.is_significant,
      statistical_power: r.statistical_power,
      mde: r.mde,
      test_used: r.test_used,
      test_explanation: r.test_explanation,
    },
    srm: null,
    health: null,
    insights: null,
  })

  // Use mutation result if available, otherwise fall back to persisted results
  const persistedResult = persistedResults?.[0]
  const result = analysisResult || (persistedResult ? mapPersisted(persistedResult) : null)

  const analysisMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.runAnalysis(id),
    onSuccess: (data) => setAnalysisResult(data),
  })

  const handleRunAnalysis = () => {
    if (expId) analysisMutation.mutate(expId)
  }

  if (!hasContext || !hasDataset) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Run statistical analysis on experiment data</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Database className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No dataset selected</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Select a dataset from Data Lab to begin analysis.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Statistical analysis for {activeDataset?.original_filename}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
          <p className="text-slate-500 font-medium">No experiment attached to this dataset</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Attach this dataset to an experiment to run statistical analysis.</p>
          <button onClick={() => navigate("/experiments")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 mx-auto">
            Go to Experiments <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Statistical analysis for {activeDataset?.original_filename}</p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={analysisMutation.isPending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          {analysisMutation.isPending ? "Running..." : "Run Analysis"}
        </button>
      </div>

      {analysisMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {(analysisMutation.error as Error)?.message}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Metric analyzed</div>
            <div className="text-sm font-semibold text-slate-900">{result.metric}</div>
            {result.statistical?.test_used && (
              <div className="text-xs text-slate-500 mt-1">Test: {result.statistical.test_used}</div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Control Mean</div>
              <div className="text-xl font-bold text-slate-900">{result.control?.mean?.toFixed(4)}</div>
              <div className="text-xs text-slate-400">n={result.control?.sample_size?.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Treatment Mean</div>
              <div className="text-xl font-bold text-slate-900">{result.treatment?.mean?.toFixed(4)}</div>
              <div className="text-xs text-slate-400">n={result.treatment?.sample_size?.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Relative Uplift</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${result.uplift?.relative >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {result.uplift?.relative >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {result.uplift?.relative >= 0 ? "+" : ""}{result.uplift?.relative?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">P-Value</div>
              <div className="text-xl font-bold text-slate-900">{result.statistical?.p_value?.toFixed(4)}</div>
              <div className="text-xs mt-1">
                {result.statistical?.is_significant ? (
                  <span className="text-emerald-600 font-medium">✓ Significant</span>
                ) : (
                  <span className="text-slate-400">Not significant</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Statistical Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">Test:</span> <span className="font-medium text-slate-900 ml-1">{result.statistical?.test_used || "—"}</span></div>
              <div><span className="text-slate-500">Confidence Level:</span> <span className="font-medium text-slate-900 ml-1">{result.statistical?.confidence_level ? `${(result.statistical.confidence_level * 100).toFixed(0)}%` : "—"}</span></div>
              <div><span className="text-slate-500">Confidence Interval:</span> <span className="font-medium text-slate-900 ml-1">[{result.uplift?.confidence_interval?.lower?.toFixed(4)}, {result.uplift?.confidence_interval?.upper?.toFixed(4)}]</span></div>
              <div><span className="text-slate-500">Statistical Power:</span> <span className="font-medium text-slate-900 ml-1">{result.statistical?.statistical_power ? `${(result.statistical.statistical_power * 100).toFixed(1)}%` : "—"}</span></div>
              <div><span className="text-slate-500">MDE:</span> <span className="font-medium text-slate-900 ml-1">{result.statistical?.mde ? `${result.statistical.mde}%` : "—"}</span></div>
            </div>
            {result.statistical?.test_explanation && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <strong>Why this test:</strong> {result.statistical.test_explanation}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Comparison</h3>
            <ErrorBoundary>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: "Control", value: typeof result.control?.mean === "number" ? result.control.mean : 0 },
                  { name: "Treatment", value: typeof result.treatment?.mean === "number" ? result.treatment.mean : 0 },
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
            </ErrorBoundary>
          </div>

          {result.srm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Sample Ratio Mismatch</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Expected:</span> <span className="font-medium ml-1">{result.srm.expected?.control}% / {result.srm.expected?.treatment}%</span></div>
                <div><span className="text-slate-500">Observed:</span> <span className="font-medium ml-1">{result.srm.observed?.control}% / {result.srm.observed?.treatment}%</span></div>
                <div><span className="text-slate-500">Chi-Square:</span> <span className="font-medium ml-1">{result.srm.chi_square}</span></div>
                <div><span className="text-slate-500">SRM Detected:</span> <span className={`font-medium ml-1 ${result.srm.has_srm ? "text-red-600" : "text-emerald-600"}`}>{result.srm.has_srm ? "Yes" : "No"}</span></div>
              </div>
              {result.srm.has_srm && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg text-xs text-red-700">{result.srm.recommendation}</div>
              )}
            </div>
          )}

          {result.health && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Health Score: <span className={result.health.score >= 90 ? "text-emerald-600" : result.health.score >= 70 ? "text-amber-600" : "text-red-600"}>{result.health.score}/100</span>
                <span className="text-slate-400 font-normal ml-2">— {result.health.status}</span>
              </h3>
              <div className="space-y-2">
                {result.health.checks?.map((check: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span>{check.status === "healthy" ? "✅" : check.status === "warning" ? "⚠️" : "❌"}</span>
                    <span className="text-slate-700"><strong>{check.name}:</strong> {check.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.insights?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Insights</h3>
              <div className="space-y-3">
                {result.insights.map((ins: any, i: number) => (
                  <div key={i} className={`p-4 rounded-lg border ${
                    ins.severity === "positive" ? "bg-emerald-50 border-emerald-200" :
                    ins.severity === "critical" ? "bg-red-50 border-red-200" :
                    ins.severity === "warning" ? "bg-amber-50 border-amber-200" :
                    "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="text-sm font-medium text-slate-900">{ins.title}</div>
                    <div className="text-xs text-slate-600 mt-1">{ins.description}</div>
                    {ins.recommendation && (
                      <div className="text-xs text-slate-500 mt-2 italic">→ {ins.recommendation}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => navigate(`/experiments/${expId}`)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
              View Full Experiment →
            </button>
          </div>
        </div>
      )}

      {!result && !analysisMutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No analysis results yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Click "Run Analysis" to generate statistical results for this dataset.</p>
          <button onClick={handleRunAnalysis} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            Run Analysis
          </button>
        </div>
      )}
    </div>
  )
}
