import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { experimentsApi, analyticsApi } from "../services/api"
import { formatDate, getStatusColor, formatPercent } from "../lib/utils"
import {
  FlaskConical, Play, Pause, Trash2, BarChart3, Users, Heart,
  Lightbulb, MessageCircle, ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

const TABS = [
  { id: "results", label: "KPI Results", icon: BarChart3 },
  { id: "segments", label: "Segments", icon: Users },
  { id: "health", label: "Health", icon: Heart },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "copilot", label: "Copilot", icon: MessageCircle },
]

export function ExperimentDetailPage() {
  const { id } = useParams()
  const experimentId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("results")
  const [copilotQuery, setCopilotQuery] = useState("")

  const { data: experiment, isLoading: loadingExp } = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => experimentsApi.get(experimentId),
    enabled: !!experimentId,
  })

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ["results", experimentId],
    queryFn: () => analyticsApi.results(experimentId),
    enabled: !!experimentId,
  })

  const { data: segments } = useQuery({
    queryKey: ["segments", experimentId],
    queryFn: () => analyticsApi.segments(experimentId),
    enabled: !!experimentId && activeTab === "segments",
  })

  const { data: health } = useQuery({
    queryKey: ["health", experimentId],
    queryFn: () => analyticsApi.health(experimentId),
    enabled: !!experimentId && activeTab === "health",
  })

  const analysisMutation = useMutation({
    mutationFn: () => analyticsApi.runAnalysis(experimentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results", experimentId] })
      queryClient.invalidateQueries({ queryKey: ["health", experimentId] })
      queryClient.invalidateQueries({ queryKey: ["segments", experimentId] })
    },
  })

  const copilotMutation = useMutation({
    mutationFn: (q: string) => analyticsApi.copilot({ query: q, experiment_id: experimentId }),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => experimentsApi.update(experimentId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => experimentsApi.delete(experimentId),
    onSuccess: () => navigate("/experiments"),
  })

  if (loadingExp) {
    return <div className="space-y-4"><div className="h-20 bg-white rounded-xl animate-pulse" /><div className="h-64 bg-white rounded-xl animate-pulse" /></div>
  }

  if (!experiment) return <div className="text-center py-12 text-slate-400">Experiment not found</div>

  const result = results?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{experiment.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>{experiment.status}</span>
            </div>
            <p className="text-slate-500 text-sm">{experiment.description || "No description"}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              {experiment.owner && <span>Owner: {experiment.owner}</span>}
              {experiment.start_date && <span>Start: {formatDate(experiment.start_date)}</span>}
              {experiment.end_date && <span>End: {formatDate(experiment.end_date)}</span>}
              {experiment.primary_metric && <span>Metric: {experiment.primary_metric}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => analysisMutation.mutate()}
              disabled={analysisMutation.isPending}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {analysisMutation.isPending ? "Analyzing..." : "Run Analysis"}
            </button>
            {experiment.status === "draft" && (
              <button onClick={() => statusMutation.mutate("running")} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
                <Play className="w-4 h-4" />
              </button>
            )}
            {experiment.status === "running" && (
              <button onClick={() => statusMutation.mutate("paused")} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg">
                <Pause className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => { if (confirm("Delete this experiment?")) deleteMutation.mutate() }} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hypothesis */}
        {experiment.hypothesis && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hypothesis</div>
            <p className="text-sm text-slate-700">{experiment.hypothesis}</p>
          </div>
        )}

        {/* Traffic Allocation */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-500">Traffic Allocation:</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="bg-blue-500 h-full" style={{ width: `${experiment.control_allocation}%` }} />
            <div className="bg-emerald-500 h-full" style={{ width: `${experiment.treatment_allocation}%` }} />
          </div>
          <span className="text-xs text-slate-500">{experiment.control_allocation}% / {experiment.treatment_allocation}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "results" && (
        <div className="space-y-6">
          {result ? (
            <>
              {/* Main Result Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">Control Mean</div>
                  <div className="text-xl font-bold text-slate-900">{result.control_mean?.toFixed(4)}</div>
                  <div className="text-xs text-slate-400 mt-1">n={result.control_sample_size?.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">Treatment Mean</div>
                  <div className="text-xl font-bold text-slate-900">{result.treatment_mean?.toFixed(4)}</div>
                  <div className="text-xs text-slate-400 mt-1">n={result.treatment_sample_size?.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">Relative Uplift</div>
                  <div className={`text-xl font-bold flex items-center gap-1 ${result.relative_uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {result.relative_uplift >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    {result.relative_uplift >= 0 ? "+" : ""}{result.relative_uplift?.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">P-Value</div>
                  <div className="text-xl font-bold text-slate-900">{result.p_value?.toFixed(4)}</div>
                  <div className="text-xs mt-1">
                    {result.is_significant ? (
                      <span className="text-emerald-600 font-medium">✓ Significant</span>
                    ) : (
                      <span className="text-slate-400">Not significant</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistical Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Statistical Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-500">Test Used:</span> <span className="font-medium text-slate-900 ml-1">{result.test_used || "—"}</span></div>
                  <div><span className="text-slate-500">Confidence Level:</span> <span className="font-medium text-slate-900 ml-1">{result.confidence_level ? `${(result.confidence_level * 100).toFixed(0)}%` : "—"}</span></div>
                  <div><span className="text-slate-500">Statistical Power:</span> <span className="font-medium text-slate-900 ml-1">{result.statistical_power ? `${(result.statistical_power * 100).toFixed(1)}%` : "—"}</span></div>
                  <div><span className="text-slate-500">MDE:</span> <span className="font-medium text-slate-900 ml-1">{result.mde ? `${result.mde}%` : "—"}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Confidence Interval:</span> <span className="font-medium text-slate-900 ml-1">[{result.confidence_interval_lower?.toFixed(4)}, {result.confidence_interval_upper?.toFixed(4)}]</span></div>
                </div>
                {result.test_explanation && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                    <strong>Why this test:</strong> {result.test_explanation}
                  </div>
                )}

                {/* Bar Chart */}
                <div className="mt-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      { name: "Control", value: result.control_mean, fill: "#3b82f6" },
                      { name: "Treatment", value: result.treatment_mean, fill: "#10b981" },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No analysis results yet</p>
              <p className="text-slate-400 text-sm mt-1">Upload a dataset and click "Run Analysis"</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "segments" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {segments && segments.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Segment</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Value</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Control</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Treatment</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Uplift</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">P-Value</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{s.segment_name}</td>
                    <td className="px-5 py-3 text-slate-600">{s.segment_value}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{s.control_mean?.toFixed(4)} (n={s.control_sample_size})</td>
                    <td className="px-5 py-3 text-right text-slate-600">{s.treatment_mean?.toFixed(4)} (n={s.treatment_sample_size})</td>
                    <td className={`px-5 py-3 text-right font-medium ${s.relative_uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {s.relative_uplift >= 0 ? "+" : ""}{s.relative_uplift?.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{s.p_value?.toFixed(4) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No segment results. Run analysis with segment columns mapped.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "health" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {health ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${health.score >= 90 ? "text-emerald-600" : health.score >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {health.score}
                  </div>
                  <div className="text-sm text-slate-500">/100</div>
                  <div className={`text-sm font-medium mt-1 ${health.score >= 90 ? "text-emerald-600" : health.score >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {health.status}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {health.checks?.map((check: any, i: number) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    check.status === "healthy" ? "bg-emerald-50 border-emerald-200" :
                    check.status === "warning" ? "bg-amber-50 border-amber-200" :
                    "bg-red-50 border-red-200"
                  }`}>
                    <span className="text-lg">{check.status === "healthy" ? "✅" : check.status === "warning" ? "⚠️" : "❌"}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{check.name}</div>
                      <div className="text-xs text-slate-600">{check.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400">Loading health data...</div>
          )}
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-4">
          {result ? (
            <>
              <div className={`p-6 rounded-xl border ${result.is_significant ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Lightbulb className={`w-5 h-5 ${result.is_significant ? "text-emerald-600" : "text-slate-500"}`} />
                  <h3 className="font-semibold text-slate-900">
                    {result.is_significant
                      ? `Treatment shows ${result.relative_uplift > 0 ? "positive" : "negative"} impact`
                      : "No statistically significant difference detected"
                    }
                  </h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {result.is_significant
                    ? `Treatment ${result.relative_uplift > 0 ? "outperforms" : "underperforms"} control by ${Math.abs(result.relative_uplift).toFixed(1)}% with ${(result.confidence_level || 0.95) * 100}% confidence (p=${result.p_value?.toFixed(4)}).`
                    : `The observed uplift of ${result.relative_uplift?.toFixed(1)}% is not statistically significant (p=${result.p_value?.toFixed(4)}).`
                  }
                </p>
                <div className="text-sm">
                  <strong>Recommendation:</strong>{" "}
                  {result.is_significant && result.relative_uplift > 0
                    ? "Roll out treatment"
                    : result.is_significant && result.relative_uplift < 0
                    ? "Investigate treatment issues"
                    : "Continue running the experiment"
                  }
                </div>
              </div>

              {result.statistical_power && result.statistical_power < 0.5 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-sm font-medium text-amber-800">⚠️ Low Statistical Power</div>
                  <p className="text-xs text-amber-700 mt-1">Current power is {(result.statistical_power * 100).toFixed(1)}%. Aim for 80% or higher.</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Run analysis to generate insights
            </div>
          )}
        </div>
      )}

      {activeTab === "copilot" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Experiment Copilot</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && copilotQuery.trim()) {
                  copilotMutation.mutate(copilotQuery.trim())
                  setCopilotQuery("")
                }
              }}
              placeholder="Ask about this experiment... (e.g., 'Which variant won?', 'Is there SRM?', 'What should I do next?')"
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => { if (copilotQuery.trim()) { copilotMutation.mutate(copilotQuery.trim()); setCopilotQuery("") } }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Ask
            </button>
          </div>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["Which variant won?", "Is the result significant?", "Is there SRM?", "What should I do next?", "What is the sample size?"].map((q) => (
              <button key={q} onClick={() => copilotMutation.mutate(q)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-600 transition-colors">
                {q}
              </button>
            ))}
          </div>

          {copilotMutation.isPending && <div className="p-4 text-sm text-slate-400 animate-pulse">Thinking...</div>}
          {copilotMutation.data && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: copilotMutation.data.answer?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") || "" }} />
              </div>
            </div>
          )}
          {copilotMutation.isError && (
            <div className="p-4 bg-red-50 rounded-lg text-sm text-red-600">Failed to get answer. Make sure you've run analysis first.</div>
          )}
        </div>
      )}
    </div>
  )
}
