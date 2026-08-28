import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { reportsApi, experimentsApi } from "../services/api"
import { formatDate } from "../lib/utils"
import { FileText, Download, Plus, Trash2 } from "lucide-react"

export function ReportsPage() {
  const queryClient = useQueryClient()
  const [selectedExpId, setSelectedExpId] = useState<number | null>(null)
  const [title, setTitle] = useState("")

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => reportsApi.list(),
  })

  const { data: experiments } = useQuery({
    queryKey: ["experiments"],
    queryFn: () => experimentsApi.list({ page_size: "50" }),
  })

  const generateMutation = useMutation({
    mutationFn: (data: { experiment_id: number; title: string }) => reportsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reportsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  })

  const handleGenerate = () => {
    if (!selectedExpId || !title.trim()) return
    generateMutation.mutate({ experiment_id: selectedExpId, title: title.trim() })
    setTitle("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and manage experiment reports</p>
      </div>

      {/* Generate Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Generate New Report</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Experiment</label>
            <select value={selectedExpId || ""} onChange={(e) => setSelectedExpId(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">Select experiment...</option>
              {experiments?.experiments?.map((exp: any) => <option key={exp.id} value={exp.id}>{exp.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Report Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g., Checkout Flow Report" />
          </div>
          <button onClick={handleGenerate} disabled={!selectedExpId || !title.trim() || generateMutation.isPending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {generateMutation.isPending ? "Generating..." : "Generate"}
          </button>
        </div>
        {generateMutation.isError && <div className="mt-2 text-sm text-red-600">{(generateMutation.error as Error)?.message}</div>}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-medium text-slate-600">Report</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Size</th>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Created</th>
              <th className="text-right px-5 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(3)].map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>)
            ) : reports?.length > 0 ? (
              reports.map((report: any) => (
                <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{report.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 capitalize">{report.report_type}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                      report.status === "generating" ? "bg-blue-100 text-blue-700" :
                      report.status === "failed" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{report.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {report.file_size_bytes > 0 ? `${(report.file_size_bytes / 1024).toFixed(1)} KB` : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(report.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {report.status === "completed" && (
                        <a href={reportsApi.downloadUrl(report.id)} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium">
                          <Download className="w-3 h-3" /> Download
                        </a>
                      )}
                      <button onClick={() => { if (confirm("Delete this report?")) deleteMutation.mutate(report.id) }} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No reports yet. Generate a report for any experiment.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
