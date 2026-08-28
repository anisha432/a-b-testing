import { useQuery } from "@tanstack/react-query"
import { experimentsApi, analyticsApi } from "../services/api"
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { useState } from "react"

export function InsightsPage() {
  const { data: experiments } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => experimentsApi.list({ page_size: "50" }),
  })

  const exps = experiments?.experiments || []
  const completedExps = exps.filter((e: any) => e.status === "completed")
  const runningExps = exps.filter((e: any) => e.status === "running")

  const insights = []

  // Generate cross-experiment insights from data
  if (completedExps.length > 0) {
    insights.push({
      type: "summary",
      severity: "info",
      icon: Info,
      title: `${completedExps.length} experiment(s) completed`,
      description: "Review results and determine which treatments to roll out.",
    })
  }
  if (runningExps.length > 0) {
    insights.push({
      type: "running",
      severity: "info",
      icon: TrendingUp,
      title: `${runningExps.length} experiment(s) currently running`,
      description: "Monitor these experiments for significant results and health issues.",
    })
  }

  // Generate recommendations based on experiment statuses
  for (const exp of exps) {
    if (exp.status === "running") {
      insights.push({
        type: "experiment",
        severity: "info",
        icon: CheckCircle,
        title: `Experiment "${exp.name}" is active`,
        description: `Type: ${exp.experiment_type}. Owner: ${exp.owner || "Unknown"}. Run analysis to check for results.`,
        recommendation: "Navigate to the experiment detail page and click 'Run Analysis'.",
      })
    }
    if (exp.status === "completed") {
      insights.push({
        type: "experiment",
        severity: "positive",
        icon: CheckCircle,
        title: `Experiment "${exp.name}" completed`,
        description: "Review the results, statistical significance, and business impact before making a decision.",
        recommendation: "Check the experiment detail page for full analysis results.",
      })
    }
    if (exp.status === "paused") {
      insights.push({
        type: "experiment",
        severity: "warning",
        icon: AlertTriangle,
        title: `Experiment "${exp.name}" is paused`,
        description: "This experiment is not collecting data. Consider resuming or archiving it.",
        recommendation: "Resume the experiment or archive it if no longer relevant.",
      })
    }
    if (exp.status === "draft") {
      insights.push({
        type: "experiment",
        severity: "warning",
        icon: AlertTriangle,
        title: `Experiment "${exp.name}" is in draft`,
        description: "This experiment needs configuration before it can run.",
        recommendation: "Upload a dataset, map columns, and start the experiment.",
      })
    }
  }

  const iconMap: Record<string, any> = {
    positive: CheckCircle,
    warning: AlertTriangle,
    critical: AlertTriangle,
    info: Info,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
        <p className="text-slate-500 text-sm mt-1">AI-generated insights and recommendations across all experiments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-blue-600">{completedExps.length}</div>
          <div className="text-sm text-slate-500">Completed Experiments</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-emerald-600">{runningExps.length}</div>
          <div className="text-sm text-slate-500">Running Experiments</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <div className="text-3xl font-bold text-amber-600">{insights.filter((i) => i.severity === "warning").length}</div>
          <div className="text-sm text-slate-500">Action Items</div>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((ins, i) => {
          const Icon = ins.icon || Info
          return (
            <div key={i} className={`p-5 rounded-xl border ${
              ins.severity === "positive" ? "bg-emerald-50 border-emerald-200" :
              ins.severity === "warning" ? "bg-amber-50 border-amber-200" :
              ins.severity === "critical" ? "bg-red-50 border-red-200" :
              "bg-white border-slate-200"
            }`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${
                  ins.severity === "positive" ? "text-emerald-600" :
                  ins.severity === "warning" ? "text-amber-600" :
                  ins.severity === "critical" ? "text-red-600" :
                  "text-blue-600"
                }`} />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{ins.title}</h3>
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
            <p className="text-slate-500">No insights available. Create experiments and run analysis to see insights.</p>
          </div>
        )}
      </div>
    </div>
  )
}
