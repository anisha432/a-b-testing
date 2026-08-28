import { useQuery } from "@tanstack/react-query"
import { analyticsApi } from "../services/api"
import { formatNumber, formatPercent, formatDate, getStatusColor } from "../lib/utils"
import { FlaskConical, CheckCircle2, TrendingUp, Zap, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  running: "#3b82f6",
  paused: "#f59e0b",
  completed: "#10b981",
  archived: "#6b7280",
}

const ACTIVITY_ICONS: Record<string, string> = {
  experiment_created: "🧪",
  dataset_uploaded: "📁",
  analysis_completed: "📊",
  significant_result_detected: "🎯",
  report_generated: "📄",
  experiment_updated: "✏️",
}

export function OverviewPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => analyticsApi.overview(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const stats = overview?.stats || {}
  const statusDist = overview?.status_distribution || {}
  const topExps = overview?.top_experiments || []
  const activities = overview?.recent_activities || []

  const pieData = Object.entries(statusDist).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: value as number }))

  const kpiCards = [
    { label: "Active Experiments", value: stats.active_experiments, icon: FlaskConical, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Completed", value: stats.completed_experiments, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Avg Uplift", value: stats.average_uplift != null ? formatPercent(stats.average_uplift) : "—", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Significant Results", value: stats.significant_experiments, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Experiments", value: overview?.total_experiments || 0, icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Experimentation intelligence at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
            <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Experiment Status Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Experiment Status</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.name.toLowerCase()] || "#94a3b8" }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Experiments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Performing Experiments</h3>
          {topExps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs font-medium text-slate-500">Experiment</th>
                    <th className="text-right py-2 text-xs font-medium text-slate-500">Control</th>
                    <th className="text-right py-2 text-xs font-medium text-slate-500">Treatment</th>
                    <th className="text-right py-2 text-xs font-medium text-slate-500">Uplift</th>
                    <th className="text-right py-2 text-xs font-medium text-slate-500">Confidence</th>
                    <th className="text-right py-2 text-xs font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topExps.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 font-medium text-slate-900 truncate max-w-[200px]">{exp.name}</td>
                      <td className="py-2.5 text-right text-slate-600">{exp.control_mean?.toFixed(4)}</td>
                      <td className="py-2.5 text-right text-slate-600">{exp.treatment_mean?.toFixed(4)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-flex items-center gap-1 font-medium ${exp.uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {exp.uplift >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {exp.uplift >= 0 ? "+" : ""}{exp.uplift?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600">{exp.confidence != null ? `${exp.confidence}%` : "—"}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exp.status)}`}>{exp.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No experiment results yet</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</h3>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 8).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="text-lg">{ACTIVITY_ICONS[a.action] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-900 font-medium">{a.action.replace(/_/g, " ")}</span>
                  {a.entity_name && <span className="text-sm text-slate-500"> — {a.entity_name}</span>}
                  {a.details && <div className="text-xs text-slate-400 mt-0.5">{a.details}</div>}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">No recent activity</div>
        )}
      </div>
    </div>
  )
}
