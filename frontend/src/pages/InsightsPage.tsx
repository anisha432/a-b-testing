import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { analyticsApi } from "../services/api"
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Info, FlaskConical, ArrowRight } from "lucide-react"

export function InsightsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ["insights"],
    queryFn: () => analyticsApi.insights(),
  })

  const insights = data?.insights || []
  const summary = data?.summary || { total: 0, completed: 0, running: 0, significant: 0 }

  const severityConfig: Record<string, { bg: string; border: string; iconColor: string; Icon: any }> = {
    positive: { bg: "bg-emerald-50", border: "border-emerald-200", iconColor: "text-emerald-600", Icon: CheckCircle },
    critical: { bg: "bg-red-50", border: "border-red-200", iconColor: "text-red-600", Icon: AlertTriangle },
    warning: { bg: "bg-amber-50", border: "border-amber-200", iconColor: "text-amber-600", Icon: AlertTriangle },
    info: { bg: "bg-white", border: "border-slate-200", iconColor: "text-blue-600", Icon: Info },
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
        <p className="text-slate-500 text-sm mt-1">Data-driven insights and recommendations based on your experiment results</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-blue-600">{summary.total}</div>
          <div className="text-sm text-slate-500">Total Experiments</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-emerald-600">{summary.completed}</div>
          <div className="text-sm text-slate-500">Completed</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-amber-600">{summary.running}</div>
          <div className="text-sm text-slate-500">Running</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-violet-600">{summary.significant}</div>
          <div className="text-sm text-slate-500">Significant Results</div>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.map((ins: any, i: number) => {
          const config = severityConfig[ins.severity] || severityConfig.info
          const Icon = config.Icon
          return (
            <div
              key={i}
              className={`p-5 rounded-xl border ${config.bg} ${config.border}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${config.iconColor}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{ins.title}</h3>
                    {ins.experiment_name && (
                      <button
                        onClick={() => navigate(`/experiments/${ins.experiment_id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <FlaskConical className="w-3 h-3" />
                        {ins.experiment_name}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{ins.description}</p>
                  {ins.recommendation && (
                    <p className="text-xs text-slate-500 mt-2 italic">→ {ins.recommendation}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {insights.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Lightbulb className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No insights yet</p>
            <p className="text-slate-400 text-sm mt-1">Create experiments, upload datasets, and run analysis to see data-driven insights.</p>
          </div>
        )}
      </div>
    </div>
  )
}
