import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { datasetsApi } from "../services/api"
import { formatNumber } from "../lib/utils"
import { Database, Upload, Eye, BarChart3, Trash2, ChevronLeft, ChevronRight } from "lucide-react"

export function DataLabPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null)
  const [view, setView] = useState<"list" | "preview" | "quality" | "mapping">("list")
  const [previewPage, setPreviewPage] = useState(1)

  const { data: datasets, isLoading } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => datasetsApi.list(),
  })

  const { data: preview } = useQuery({
    queryKey: ["datasetPreview", selectedDatasetId, previewPage],
    queryFn: () => datasetsApi.preview(selectedDatasetId!, previewPage, 50),
    enabled: !!selectedDatasetId && view === "preview",
  })

  const { data: quality, isLoading: loadingQuality } = useQuery({
    queryKey: ["datasetQuality", selectedDatasetId],
    queryFn: () => datasetsApi.quality(selectedDatasetId!),
    enabled: !!selectedDatasetId && view === "quality",
  })

  const { data: datasetDetail } = useQuery({
    queryKey: ["dataset", selectedDatasetId],
    queryFn: () => datasetsApi.get(selectedDatasetId!),
    enabled: !!selectedDatasetId,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => datasetsApi.upload(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      setSelectedDatasetId(data.id)
      setView("preview")
    },
  })

  const mappingMutation = useMutation({
    mutationFn: ({ id, mappings }: { id: number; mappings: Record<string, string> }) => datasetsApi.updateMapping(id, mappings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dataset"] }),
  })

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Lab</h1>
          <p className="text-slate-500 text-sm mt-1">Upload, validate, and prepare experiment datasets</p>
        </div>
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          <Upload className="w-4 h-4" />
          Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
      </div>

      {uploadMutation.isPending && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 animate-pulse">Uploading dataset...</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dataset List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Datasets</h3>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />)
            ) : datasets?.length > 0 ? (
              datasets.map((ds: any) => (
                <button
                  key={ds.id}
                  onClick={() => { setSelectedDatasetId(ds.id); setView("preview") }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedDatasetId === ds.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900 truncate">{ds.original_filename}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{formatNumber(ds.row_count)} rows × {ds.column_count} cols</div>
                  {ds.quality_score != null && (
                    <div className={`text-xs font-medium mt-1 ${ds.quality_score >= 80 ? "text-emerald-600" : ds.quality_score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      Quality: {ds.quality_score}/100
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No datasets yet
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {selectedDatasetId && (
            <>
              {/* View Tabs */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                {[
                  { id: "preview", label: "Preview", icon: Eye },
                  { id: "quality", label: "Data Quality", icon: BarChart3 },
                  { id: "mapping", label: "Column Mapping", icon: Database },
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setView(tab.id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${view === tab.id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Preview */}
              {view === "preview" && preview && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {preview.columns.map((col: string) => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-medium text-slate-600 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            {preview.columns.map((col: string) => (
                              <td key={col} className="px-3 py-2 text-xs text-slate-600 max-w-[200px] truncate">{row[col] ?? "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500">Showing {preview.rows.length} of {preview.total_rows} rows</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewPage(Math.max(1, previewPage - 1))} disabled={previewPage <= 1} className="p-1 border rounded disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-xs text-slate-500 px-2">Page {previewPage}</span>
                      <button onClick={() => setPreviewPage(previewPage + 1)} disabled={preview.rows.length < 50} className="p-1 border rounded disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Quality */}
              {view === "quality" && (
                <div className="space-y-4">
                  {loadingQuality ? (
                    <div className="bg-white rounded-xl border p-12 text-center animate-pulse text-slate-400">Analyzing data quality...</div>
                  ) : quality ? (
                    <>
                      {/* Quality Score */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className={`text-5xl font-bold ${quality.score >= 80 ? "text-emerald-600" : quality.score >= 60 ? "text-amber-600" : "text-red-600"}`}>{quality.score}</div>
                            <div className="text-sm text-slate-500">/ 100</div>
                            <div className="text-sm font-medium text-slate-700 mt-1">Data Quality Score</div>
                          </div>
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <div className="text-lg font-bold text-slate-900">{formatNumber(quality.total_rows)}</div>
                              <div className="text-xs text-slate-500">Total Rows</div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <div className="text-lg font-bold text-slate-900">{quality.duplicate_count}</div>
                              <div className="text-xs text-slate-500">Duplicates</div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <div className="text-lg font-bold text-slate-900">{quality.outliers_detected}</div>
                              <div className="text-xs text-slate-500">Outliers</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Warnings */}
                      {quality.warnings?.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                          <h3 className="text-sm font-semibold text-slate-900 mb-3">Warnings</h3>
                          <div className="space-y-2">
                            {quality.warnings.map((w: any, i: number) => (
                              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${w.severity === "critical" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                                <span>{w.severity === "critical" ? "🔴" : "🟡"}</span>
                                <span className="text-slate-700">{w.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {quality.recommendations?.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                          <h3 className="text-sm font-semibold text-slate-900 mb-3">Recommendations</h3>
                          <ul className="space-y-2">
                            {quality.recommendations.map((r: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="text-blue-500 mt-0.5">💡</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}

              {/* Column Mapping */}
              {view === "mapping" && datasetDetail && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Column Mapping</h3>
                  <p className="text-xs text-slate-500 mb-4">Map columns to experiment roles for automatic analysis.</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-xs font-medium text-slate-500">Column</th>
                        <th className="text-left py-2 text-xs font-medium text-slate-500">Type</th>
                        <th className="text-left py-2 text-xs font-medium text-slate-500">Unique</th>
                        <th className="text-left py-2 text-xs font-medium text-slate-500">Null %</th>
                        <th className="text-left py-2 text-xs font-medium text-slate-500">Mapped To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasetDetail.columns?.map((col: any) => (
                        <tr key={col.id} className="border-b border-slate-50">
                          <td className="py-2 font-medium text-slate-900">{col.name}</td>
                          <td className="py-2 text-slate-500">{col.data_type}</td>
                          <td className="py-2 text-slate-500">{col.unique_count}</td>
                          <td className="py-2 text-slate-500">{col.null_percentage}%</td>
                          <td className="py-2">
                            <select
                              value={col.mapped_to || ""}
                              onChange={(e) => {
                                const mappings: Record<string, string> = {}
                                datasetDetail.columns.forEach((c: any) => {
                                  mappings[c.name] = c.name === col.name ? e.target.value || null : c.mapped_to
                                })
                                mappingMutation.mutate({ id: datasetDetail.id, mappings })
                              }}
                              className="px-2 py-1 border border-slate-200 rounded text-xs"
                            >
                              <option value="">Not mapped</option>
                              <option value="user_id">User ID</option>
                              <option value="variant">Variant</option>
                              <option value="timestamp">Timestamp</option>
                              <option value="metric">Metric</option>
                              <option value="conversion">Conversion</option>
                              <option value="revenue">Revenue</option>
                              <option value="segment">Segment</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!selectedDatasetId && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Database className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No dataset selected</h3>
              <p className="text-sm text-slate-500">Upload a CSV file or select an existing dataset</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
