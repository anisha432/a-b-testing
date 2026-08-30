import { useNavigate } from "react-router-dom"
import { useAnalysisContext } from "../contexts/AnalysisContext"
import { Database, FlaskConical, X, ArrowRight, Loader2, AlertTriangle } from "lucide-react"
import { formatNumber } from "../lib/utils"

export function ActiveContextBar() {
  const { activeDataset, activeExperiment, isLoading, clearContext, hasContext, hasDataset, hasExperiment } = useAnalysisContext()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 flex items-center gap-2 text-sm text-blue-700">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading analysis context...
      </div>
    )
  }

  if (!hasContext || !hasDataset) {
    return (
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Database className="w-4 h-4" />
          <span>No active analysis context</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-400">Select a dataset in Data Lab to begin</span>
        </div>
        <button
          onClick={() => navigate("/data-lab")}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          Go to Data Lab <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 rounded-md">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium text-blue-900">{activeDataset?.original_filename}</span>
        </div>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">{formatNumber(activeDataset?.row_count || 0)} rows · {activeDataset?.column_count || 0} cols</span>
        <span className="text-slate-400">·</span>
        {hasExperiment ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-100 rounded-md">
            <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium text-indigo-900">{activeExperiment?.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium text-amber-900">No experiment attached</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/analytics")}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          View Analytics <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={clearContext}
          className="p-1 hover:bg-white/60 rounded text-slate-400 hover:text-slate-600"
          title="Clear context"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
