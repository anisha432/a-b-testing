import { useQuery } from "@tanstack/react-query"
import { analyticsApi } from "../services/api"
import { Monitor, AlertTriangle, CheckCircle, Activity, Clock, Shield } from "lucide-react"

export function MonitorPage() {
  const { data: monitor, isLoading } = useQuery({
    queryKey: ["monitor"],
    queryFn: () => analyticsApi.monitor(),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
  }

  const alerts = monitor?.alerts || []
  const experiments = monitor?.experiments || []

  const getSeverityColor = (type: string) => {
    switch (type) {
      case "critical": return "bg-red-50 border-red-200"
      case "warning": return "bg-amber-50 border-amber-200"
      case "info": return "bg-blue-50 border-blue-200"
      default: return "bg-emerald-50 border-emerald-200"
    }
  }

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case "critical": return "🔴"
      case "warning": return "🟡"
      case "info": return "🔵"
      default: return "🟢"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitor</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time experiment monitoring center</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Activity className="w-5 h-5 text-blue-600" /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{monitor?.active_experiments || 0}</div>
              <div className="text-xs text-slate-500">Active Experiments</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div>
              <div className="text-2xl font-bold text-red-600">{alerts.filter((a: any) => a.type === "critical").length}</div>
              <div className="text-xs text-slate-500">Critical Alerts</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{alerts.filter((a: any) => a.type === "warning").length}</div>
              <div className="text-xs text-slate-500">Warnings</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{experiments.filter((e: any) => e.alert_count === 0).length}</div>
              <div className="text-xs text-slate-500">Healthy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Active Alerts</h3>
          <div className="space-y-2">
            {alerts.map((alert: any) => (
              <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg border ${getSeverityColor(alert.type)}`}>
                <span className="text-sm mt-0.5">{getSeverityIcon(alert.type)}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{alert.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{alert.message}</div>
                  <div className="text-xs text-slate-400 mt-1">Category: {alert.category || "general"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experiment Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Experiment Status</h3>
        <div className="space-y-3">
          {experiments.map((exp: any) => (
            <div key={exp.experiment_id} className={`flex items-center gap-4 p-4 rounded-lg border ${exp.alert_count > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
              <div className={`w-3 h-3 rounded-full ${exp.status === "running" ? "bg-blue-500 animate-pulse" : "bg-slate-300"}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">{exp.experiment_name}</div>
                <div className="text-xs text-slate-500">Status: {exp.status} · Data: {exp.data_status} · Freshness: {exp.freshness}</div>
              </div>
              {exp.alert_count > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{exp.alert_count} alert(s)</span>
              )}
              {exp.alert_count === 0 && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Healthy</span>
              )}
            </div>
          ))}
          {experiments.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No active experiments to monitor</div>
          )}
        </div>
      </div>

      {alerts.length === 0 && experiments.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Monitor className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No active experiments or alerts. Start an experiment to begin monitoring.</p>
        </div>
      )}
    </div>
  )
}
