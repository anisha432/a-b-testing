import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { experimentsApi, analyticsApi } from "../services/api"
import { TrendingUp, ArrowUpRight, DollarSign } from "lucide-react"

export function BusinessImpactPage() {
  const [selectedExpId, setSelectedExpId] = useState<number | null>(null)
  const [revenuePerUser, setRevenuePerUser] = useState("50")
  const [dailyUsers, setDailyUsers] = useState("10000")

  const { data: experiments } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => experimentsApi.list({ page_size: "50" }),
  })

  const { data: results } = useQuery({
    queryKey: ["results", selectedExpId],
    queryFn: () => analyticsApi.results(selectedExpId!),
    enabled: !!selectedExpId,
  })

  const { data: business } = useQuery({
    queryKey: ["business", selectedExpId],
    queryFn: () => analyticsApi.business(selectedExpId!),
    enabled: !!selectedExpId,
  })

  const completedExps = experiments?.experiments?.filter((e: any) => e.status === "completed") || []
  const result = results?.[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Business Impact</h1>
        <p className="text-slate-500 text-sm mt-1">Convert experiment results into business outcomes</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Experiment</label>
            <select value={selectedExpId || ""} onChange={(e) => setSelectedExpId(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">Select...</option>
              {completedExps.map((exp: any) => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Revenue/User/Month ($)</label>
            <input type="number" value={revenuePerUser} onChange={(e) => setRevenuePerUser(e.target.value)} className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Daily Active Users</label>
            <input type="number" value={dailyUsers} onChange={(e) => setDailyUsers(e.target.value)} className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Uplift</div>
              <div className={`text-2xl font-bold ${result.relative_uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {result.relative_uplift >= 0 ? "+" : ""}{result.relative_uplift?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Incremental/Unit</div>
              <div className="text-2xl font-bold text-slate-900">{result.absolute_difference?.toFixed(4)}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Monthly Impact</div>
              <div className="text-2xl font-bold text-slate-900">
                {business?.estimated_monthly_impact ? `$${business.estimated_monthly_impact.toLocaleString()}` : "—"}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-xs text-slate-500 mb-1">Annual Impact</div>
              <div className="text-2xl font-bold text-slate-900">
                {business?.estimated_annual_impact ? `$${business.estimated_annual_impact.toLocaleString()}` : "—"}
              </div>
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

      {!selectedExpId && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <TrendingUp className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Select a completed experiment to view business impact</p>
        </div>
      )}
    </div>
  )
}
