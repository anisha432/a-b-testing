import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { experimentsApi } from "../services/api"
import { formatDate, getStatusColor, formatPercent } from "../lib/utils"
import { Plus, FlaskConical, Filter } from "lucide-react"

export function ExperimentsPage() {
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(1)

  const params: Record<string, string> = { page: String(page), page_size: "20" }
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.experiment_type = typeFilter

  const { data, isLoading } = useQuery({
    queryKey: ["experiments", params],
    queryFn: () => experimentsApi.list(params),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Experiments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track all experiments</p>
        </div>
        <Link
          to="/experiments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Experiment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="conversion">Conversion</option>
          <option value="revenue">Revenue</option>
          <option value="engagement">Engagement</option>
          <option value="retention">Retention</option>
          <option value="performance">Performance</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-medium text-slate-600">Experiment</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Owner</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Metric</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={6} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : data?.experiments?.length > 0 ? (
              data.experiments.map((exp: any) => (
                <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/experiments/${exp.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {exp.name}
                    </Link>
                    {exp.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[300px]">{exp.description}</div>}
                  </td>
                  <td className="px-5 py-3 text-slate-600 capitalize">{exp.experiment_type}</td>
                  <td className="px-5 py-3 text-slate-600">{exp.owner || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{exp.primary_metric || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exp.status)}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(exp.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <FlaskConical className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No experiments found</p>
                  <Link to="/experiments/new" className="text-blue-600 text-sm hover:underline mt-1 inline-block">Create your first experiment</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">Showing {data.experiments.length} of {data.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={data.experiments.length < 20} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
