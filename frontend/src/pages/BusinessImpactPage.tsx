import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { analyticsApi } from "../services/api"
import { useAnalysisContext } from "../contexts/AnalysisContext"
import { TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle, Database, ArrowRight } from "lucide-react"

export function BusinessImpactPage() {
  const navigate = useNavigate()
  const { activeExperimentId, activeDataset, hasContext, hasDataset, hasExperiment } = useAnalysisContext()
  const [revenuePerUser, setRevenuePerUser] = useState("50")
  const [dailyUsers, setDailyUsers] = useState("10000")

  const { data: results } = useQuery({
    queryKey: ["results", activeExperimentId],
    queryFn: () => analyticsApi.results(activeExperimentId!),
    enabled: !!activeExperimentId && hasContext,
  })

  const { data: business } = useQuery({
    queryKey: ["business", activeExperimentId, revenuePerUser, dailyUsers],
    queryFn: () => analyticsApi.business(activeExperimentId!, {
      monthlyRevenuePerUser: Number(revenuePerUser) || undefined,
      dailyUsers: Number(dailyUsers) || undefined,
    }),
    enabled: !!activeExperimentId && hasContext,
    retry: false,
  })

  const result = results?.[0]

  if (!hasContext || !hasDataset) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Business Impact</h1>
          <p className="text-slate-500 text-sm mt-1">Convert experiment results into business outcomes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Database className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No dataset selected</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Select a dataset from Data Lab to view business impact.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Business Impact</h1>
          <p className="text-slate-500 text-sm mt-1">Business impact for {activeDataset?.original_filename}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
          <p className="text-slate-500 font-medium">No experiment attached to this dataset</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Attach this dataset to an experiment to view business impact.</p>
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
        <h1 className="text-2xl font-bold text-slate-900">Business Impact</h1>
        <p className="text-slate-500 text-sm mt-1">Business impact for {activeDataset?.original_filename}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Revenue/User/Month ($)</label>
            <input type="number" value={revenuePerUser} onChange={(e) => setRevenuePerUser(e.target.value)} className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Daily Active Users</label>
            <input type="number" value={dailyUsers} onChange={(e) => setDailyUsers(e.target.value)} className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {!result && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
          <p className="text-slate-500 font-medium">No analysis results for this dataset</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Run analysis first to see business impact metrics.</p>
          <button onClick={() => navigate("/analytics")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
            Go to Analytics →
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Relative Uplift</div>
              <div className={`text-2xl font-bold flex items-center gap-1 ${result.relative_uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {result.relative_uplift >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {result.relative_uplift >= 0 ? "+" : ""}{result.relative_uplift?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Incremental per User</div>
              <div className="text-2xl font-bold text-slate-900">{result.absolute_difference?.toFixed(4)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Monthly Impact</div>
              <div className="text-2xl font-bold text-slate-900">
                {business?.estimated_monthly_impact != null ? `$${business.estimated_monthly_impact.toLocaleString()}` : "—"}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Annual Impact</div>
              <div className="text-2xl font-bold text-slate-900">
                {business?.estimated_annual_impact != null ? `$${business.estimated_annual_impact.toLocaleString()}` : "—"}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Detailed Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">Control Mean:</span> <span className="font-medium text-slate-900 ml-1">{result.control_mean?.toFixed(4)}</span></div>
              <div><span className="text-slate-500">Treatment Mean:</span> <span className="font-medium text-slate-900 ml-1">{result.treatment_mean?.toFixed(4)}</span></div>
              <div><span className="text-slate-500">Total Users:</span> <span className="font-medium text-slate-900 ml-1">{(result.control_sample_size + result.treatment_sample_size)?.toLocaleString()}</span></div>
              <div><span className="text-slate-500">Significance:</span> <span className={`font-medium ml-1 ${result.is_significant ? "text-emerald-600" : "text-slate-400"}`}>{result.is_significant ? "Yes (p=" + result.p_value?.toFixed(4) + ")" : "No"}</span></div>
              <div><span className="text-slate-500">Affected Users/Day:</span> <span className="font-medium text-slate-900 ml-1">{Number(dailyUsers).toLocaleString()}</span></div>
            </div>
          </div>

          {business?.confidence_range && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Confidence Range (Monthly)</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-600">Low: <strong>${business.confidence_range.lower?.toLocaleString()}</strong></div>
                <div className="flex-1 h-4 bg-slate-100 rounded-full relative">
                  <div className="absolute left-0 top-0 h-full bg-blue-200 rounded-full" style={{ width: "100%" }} />
                  <div className="absolute top-0 h-full bg-blue-500 rounded-full" style={{ left: "20%", width: "60%" }} />
                </div>
                <div className="text-sm text-slate-600">High: <strong>${business.confidence_range.upper?.toLocaleString()}</strong></div>
              </div>
            </div>
          )}

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            ⚠️ Estimates are based on observed experiment data and provided assumptions. Actual results may vary.
          </div>
        </div>
      )}
    </div>
  )
}
