import { useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { experimentsApi, analyticsApi, datasetsApi } from "../services/api"
import { formatDate, getStatusColor, formatNumber } from "../lib/utils"
import {
  FlaskConical, Play, Pause, Trash2, BarChart3, Users, Heart,
  Lightbulb, MessageCircle, ArrowUpRight, ArrowDownRight, Activity,
  Upload, Database, X, ChevronRight, CheckCircle2, AlertTriangle,
  FileSpreadsheet, RefreshCw, Link2, Unlink, Loader2
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { ErrorBoundary } from "../components/ErrorBoundary"

const TABS = [
  { id: "results", label: "KPI Results", icon: BarChart3 },
  { id: "segments", label: "Segments", icon: Users },
  { id: "health", label: "Health", icon: Heart },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "copilot", label: "Copilot", icon: MessageCircle },
]

export function ExperimentDetailPage() {
  const { id } = useParams()
  const experimentId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("results")
  const [copilotQuery, setCopilotQuery] = useState("")
  const [showPicker, setShowPicker] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: experiment, isLoading: loadingExp } = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => experimentsApi.get(experimentId),
    enabled: !!experimentId,
  })

  const { data: dataset, isLoading: loadingDataset } = useQuery({
    queryKey: ["experimentDataset", experimentId],
    queryFn: () => experimentsApi.getDataset(experimentId),
    enabled: !!experimentId,
    retry: false,
  })

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ["results", experimentId],
    queryFn: () => analyticsApi.results(experimentId),
    enabled: !!experimentId,
  })

  const { data: segments } = useQuery({
    queryKey: ["segments", experimentId],
    queryFn: () => analyticsApi.segments(experimentId),
    enabled: !!experimentId && activeTab === "segments",
  })

  const { data: health } = useQuery({
    queryKey: ["health", experimentId],
    queryFn: () => analyticsApi.health(experimentId),
    enabled: !!experimentId && activeTab === "health",
  })

  const { data: allDatasets } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => datasetsApi.list(),
    enabled: showPicker,
  })

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const analysisMutation = useMutation({
    mutationFn: () => analyticsApi.runAnalysis(experimentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results", experimentId] })
      queryClient.invalidateQueries({ queryKey: ["health", experimentId] })
      queryClient.invalidateQueries({ queryKey: ["segments", experimentId] })
    },
  })

  const copilotMutation = useMutation({
    mutationFn: (q: string) => analyticsApi.copilot({ query: q, experiment_id: experimentId }),
  })

  const completeMutation = useMutation({
    mutationFn: () => experimentsApi.complete(experimentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] }),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => experimentsApi.update(experimentId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => experimentsApi.delete(experimentId),
    onSuccess: () => navigate("/experiments"),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => experimentsApi.uploadDataset(experimentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experimentDataset", experimentId] })
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      setShowUpload(false)
    },
  })

  const attachMutation = useMutation({
    mutationFn: (datasetId: number) => experimentsApi.attachDataset(experimentId, datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experimentDataset", experimentId] })
      setShowPicker(false)
    },
  })

  const detachMutation = useMutation({
    mutationFn: () => experimentsApi.detachDataset(experimentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experimentDataset", experimentId] })
      queryClient.invalidateQueries({ queryKey: ["results", experimentId] })
    },
  })

  // ─── Loading / Error states ─────────────────────────────────────────────────
  if (loadingExp) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-xl animate-pulse" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="text-center py-20">
        <FlaskConical className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500">Experiment not found</p>
        <button onClick={() => navigate("/experiments")} className="mt-3 text-sm text-blue-600 hover:underline">
          Back to experiments
        </button>
      </div>
    )
  }

  const result = results?.[0]
  const hasDataset = !!dataset
  const hasResults = !!result

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{experiment.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
                {experiment.status}
              </span>
            </div>
            <p className="text-slate-500 text-sm">{experiment.description || "No description"}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              {experiment.owner && <span>Owner: {experiment.owner}</span>}
              {experiment.start_date && <span>Start: {formatDate(experiment.start_date)}</span>}
              {experiment.end_date && <span>End: {formatDate(experiment.end_date)}</span>}
              {experiment.primary_metric && <span>Metric: {experiment.primary_metric}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => analysisMutation.mutate()}
              disabled={analysisMutation.isPending || !hasDataset}
              title={!hasDataset ? "Upload a dataset first" : ""}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {analysisMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Play className="w-4 h-4" /> Run Analysis</>
              )}
            </button>
            {experiment.status === "draft" && (
              <button onClick={() => statusMutation.mutate("running")} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
                Start
              </button>
            )}
            {experiment.status === "running" && (
              <>
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Complete
                </button>
                <button onClick={() => statusMutation.mutate("paused")} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg">
                  <Pause className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={() => { if (confirm("Delete this experiment?")) deleteMutation.mutate() }} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Analysis Error Banner */}
        {analysisMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-800">Analysis failed</div>
              <p className="text-xs text-red-600 mt-1">{(analysisMutation.error as Error)?.message || "An unexpected error occurred."}</p>
            </div>
            <button onClick={() => analysisMutation.reset()} className="text-xs text-red-500 hover:text-red-700 underline">Dismiss</button>
          </div>
        )}

        {/* Hypothesis */}
        {experiment.hypothesis && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hypothesis</div>
            <p className="text-sm text-slate-700">{experiment.hypothesis}</p>
          </div>
        )}

        {/* Traffic Allocation */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-500">Traffic Allocation:</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="bg-blue-500 h-full" style={{ width: `${experiment.control_allocation}%` }} />
            <div className="bg-emerald-500 h-full" style={{ width: `${experiment.treatment_allocation}%` }} />
          </div>
          <span className="text-xs text-slate-500">{experiment.control_allocation}% / {experiment.treatment_allocation}%</span>
        </div>
      </div>

      {/* ─── Dataset Section ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-900">Experiment Dataset</h2>
          {hasDataset && (
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Ready for analysis
            </span>
          )}
        </div>

        {loadingDataset ? (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            <span className="text-sm text-slate-500">Loading dataset...</span>
          </div>
        ) : hasDataset ? (
          /* ─── Dataset Attached ──────────────────────────────────────────────── */
          <div>
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 text-sm">{dataset.original_filename}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatNumber(dataset.row_count)} rows &middot; {dataset.column_count} columns
                  {dataset.file_size_bytes > 0 && <> &middot; {(dataset.file_size_bytes / 1024).toFixed(0)} KB</>}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>Uploaded: {formatDate(dataset.created_at)}</span>
                  {dataset.quality_score != null && (
                    <span className={`font-medium ${dataset.quality_score >= 80 ? "text-emerald-600" : dataset.quality_score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      Quality: {dataset.quality_score}/100
                    </span>
                  )}
                  <span className="text-slate-400">ID: {dataset.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Replace
                </button>
                <button
                  onClick={() => { if (confirm("Remove dataset from this experiment?")) detachMutation.mutate() }}
                  disabled={detachMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1"
                >
                  <Unlink className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>

            {/* Analysis prompt when dataset exists but no results */}
            {hasDataset && !hasResults && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900">Dataset ready</div>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Your experiment data is attached. Run the analysis to generate statistical results.
                    </p>
                  </div>
                  <button
                    onClick={() => analysisMutation.mutate()}
                    disabled={analysisMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {analysisMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Play className="w-4 h-4" /> Run Analysis</>
                    )}
                  </button>
                </div>
              </div>
            )}
            {analysisMutation.isError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-red-800">Analysis failed</div>
                  <p className="text-xs text-red-600 mt-0.5">{(analysisMutation.error as Error)?.message || "An unexpected error occurred. Please check your column mappings in Data Lab."}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─── No Dataset Attached ───────────────────────────────────────────── */
          <div className="text-center py-8">
            <Database className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">No dataset attached</h3>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
              Attach experiment data to begin your analysis. Upload a CSV or Excel (.xlsx) file directly or select an existing dataset from Data Lab.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Dataset
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Select from Data Lab
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Upload Modal ────────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Upload Dataset</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file && /\.(csv|xlsx|xls)$/i.test(file.name)) uploadMutation.mutate(file)
              }}
            >
              <Upload className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-700">Drop file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">Supports CSV and Excel (.xlsx) up to 100 MB</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            {uploadMutation.isPending && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading and analyzing dataset...
              </div>
            )}
            {uploadMutation.isError && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-600">
                Upload failed: {(uploadMutation.error as Error)?.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Dataset Picker Modal ────────────────────────────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Select Dataset</h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose an existing dataset to attach to this experiment</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              {allDatasets && allDatasets.length > 0 ? (
                <div className="space-y-2">
                  {allDatasets.filter((ds: any) => ds.experiment_id !== experimentId).map((ds: any) => (
                    <button
                      key={ds.id}
                      onClick={() => attachMutation.mutate(ds.id)}
                      disabled={attachMutation.isPending}
                      className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">{ds.original_filename}</div>
                            <div className="text-xs text-slate-500">
                              {formatNumber(ds.row_count)} rows &middot; {ds.column_count} columns
                              {ds.quality_score != null && (
                                <span className={`ml-2 font-medium ${ds.quality_score >= 80 ? "text-emerald-600" : ds.quality_score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                  Quality: {ds.quality_score}/100
                                </span>
                              )}
                            </div>
                            {ds.experiment_id && (
                              <div className="text-xs text-slate-400 mt-0.5">Attached to experiment #{ds.experiment_id}</div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No datasets in Data Lab yet</p>
                  <button
                    onClick={() => { setShowPicker(false); setShowUpload(true) }}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Upload a new dataset
                  </button>
                </div>
              )}
            </div>
            {attachMutation.isPending && (
              <div className="mx-6 mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Attaching dataset...
              </div>
            )}
            {attachMutation.isError && (
              <div className="mx-6 mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-600">
                Failed to attach: {(attachMutation.error as Error)?.message}
              </div>
            )}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setShowPicker(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────────────── */}
      {activeTab === "results" && (
        <div className="space-y-6">
          {hasResults ? (
            <>
              {/* Main Result Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">Control Mean</div>
                  <div className="text-xl font-bold text-slate-900">{result.control_mean?.toFixed(4)}</div>
                  <div className="text-xs text-slate-400 mt-1">n={result.control_sample_size?.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">Treatment Mean</div>
                  <div className="text-xl font-bold text-slate-900">{result.treatment_mean?.toFixed(4)}</div>
                  <div className="text-xs text-slate-400 mt-1">n={result.treatment_sample_size?.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">Relative Uplift</div>
                  <div className={`text-xl font-bold flex items-center gap-1 ${result.relative_uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {result.relative_uplift >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    {result.relative_uplift >= 0 ? "+" : ""}{result.relative_uplift?.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-xs text-slate-500 mb-1">P-Value</div>
                  <div className="text-xl font-bold text-slate-900">{result.p_value?.toFixed(4)}</div>
                  <div className="text-xs mt-1">
                    {result.is_significant ? (
                      <span className="text-emerald-600 font-medium">&#10003; Significant</span>
                    ) : (
                      <span className="text-slate-400">Not significant</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistical Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Statistical Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-500">Test Used:</span> <span className="font-medium text-slate-900 ml-1">{result.test_used || "\u2014"}</span></div>
                  <div><span className="text-slate-500">Confidence Level:</span> <span className="font-medium text-slate-900 ml-1">{result.confidence_level ? `${(result.confidence_level * 100).toFixed(0)}%` : "\u2014"}</span></div>
                  <div><span className="text-slate-500">Statistical Power:</span> <span className="font-medium text-slate-900 ml-1">{result.statistical_power ? `${(result.statistical_power * 100).toFixed(1)}%` : "\u2014"}</span></div>
                  <div><span className="text-slate-500">MDE:</span> <span className="font-medium text-slate-900 ml-1">{result.mde ? `${result.mde}%` : "\u2014"}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Confidence Interval:</span> <span className="font-medium text-slate-900 ml-1">[{result.confidence_interval_lower?.toFixed(4)}, {result.confidence_interval_upper?.toFixed(4)}]</span></div>
                </div>
                {result.test_explanation && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                    <strong>Why this test:</strong> {result.test_explanation}
                  </div>
                )}

                <div className="mt-6">
                  <ErrorBoundary>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { name: "Control", value: typeof result.control_mean === "number" ? result.control_mean : 0 },
                        { name: "Treatment", value: typeof result.treatment_mean === "number" ? result.treatment_mean : 0 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          <Cell fill="#3b82f6" />
                          <Cell fill="#10b981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ErrorBoundary>
                </div>
              </div>
            </>
          ) : (
            /* ─── No Results Empty State ──────────────────────────────────────── */
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No analysis results yet</p>
              {hasDataset ? (
                <div className="mt-3">
                  <p className="text-slate-400 text-sm mb-3">Run the analysis to generate statistical results.</p>
                  <button
                    onClick={() => analysisMutation.mutate()}
                    disabled={analysisMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run Analysis
                  </button>
                </div>
              ) : (
                <p className="text-slate-400 text-sm mt-1">Attach a dataset above to enable analysis.</p>
              )}
              {analysisMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-800">Analysis failed</div>
                    <p className="text-xs text-red-600 mt-0.5">{(analysisMutation.error as Error)?.message || "An unexpected error occurred. Please check your column mappings in Data Lab."}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "segments" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {segments && segments.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Segment</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Value</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Control</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Treatment</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Uplift</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">P-Value</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{s.segment_name}</td>
                    <td className="px-5 py-3 text-slate-600">{s.segment_value}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{s.control_mean?.toFixed(4)} (n={s.control_sample_size})</td>
                    <td className="px-5 py-3 text-right text-slate-600">{s.treatment_mean?.toFixed(4)} (n={s.treatment_sample_size})</td>
                    <td className={`px-5 py-3 text-right font-medium ${s.relative_uplift >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {s.relative_uplift >= 0 ? "+" : ""}{s.relative_uplift?.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{s.p_value?.toFixed(4) || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No segment results. Run analysis with segment columns mapped.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "health" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {health ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${health.score >= 90 ? "text-emerald-600" : health.score >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {health.score}
                  </div>
                  <div className="text-sm text-slate-500">/100</div>
                  <div className={`text-sm font-medium mt-1 ${health.score >= 90 ? "text-emerald-600" : health.score >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {health.status}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {health.checks?.map((check: any, i: number) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    check.status === "healthy" ? "bg-emerald-50 border-emerald-200" :
                    check.status === "warning" ? "bg-amber-50 border-amber-200" :
                    "bg-red-50 border-red-200"
                  }`}>
                    <span className="text-lg">{check.status === "healthy" ? "\u2705" : check.status === "warning" ? "\u26a0\ufe0f" : "\u274c"}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{check.name}</div>
                      <div className="text-xs text-slate-600">{check.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400">Loading health data...</div>
          )}
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-4">
          {hasResults ? (
            <>
              <div className={`p-6 rounded-xl border ${result.is_significant ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Lightbulb className={`w-5 h-5 ${result.is_significant ? "text-emerald-600" : "text-slate-500"}`} />
                  <h3 className="font-semibold text-slate-900">
                    {result.is_significant
                      ? `Treatment shows ${result.relative_uplift > 0 ? "positive" : "negative"} impact`
                      : "No statistically significant difference detected"
                    }
                  </h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {result.is_significant
                    ? `Treatment ${result.relative_uplift > 0 ? "outperforms" : "underperforms"} control by ${Math.abs(result.relative_uplift).toFixed(1)}% with ${(result.confidence_level || 0.95) * 100}% confidence (p=${result.p_value?.toFixed(4)}).`
                    : `The observed uplift of ${result.relative_uplift?.toFixed(1)}% is not statistically significant (p=${result.p_value?.toFixed(4)}).`
                  }
                </p>
                <div className="text-sm">
                  <strong>Recommendation:</strong>{" "}
                  {result.is_significant && result.relative_uplift > 0
                    ? "Roll out treatment"
                    : result.is_significant && result.relative_uplift < 0
                    ? "Investigate treatment issues"
                    : "Continue running the experiment"
                  }
                </div>
              </div>

              {result.statistical_power && result.statistical_power < 0.5 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-sm font-medium text-amber-800">Low Statistical Power</div>
                  <p className="text-xs text-amber-700 mt-1">Current power is {(result.statistical_power * 100).toFixed(1)}%. Aim for 80% or higher.</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Run analysis to generate insights
            </div>
          )}
        </div>
      )}

      {activeTab === "copilot" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Experiment Copilot</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && copilotQuery.trim()) {
                  copilotMutation.mutate(copilotQuery.trim())
                  setCopilotQuery("")
                }
              }}
              placeholder="Ask about this experiment... (e.g., 'Which variant won?', 'Is there SRM?', 'What should I do next?')"
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => { if (copilotQuery.trim()) { copilotMutation.mutate(copilotQuery.trim()); setCopilotQuery("") } }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Ask
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {["Which variant won?", "Is the result significant?", "Is there SRM?", "What should I do next?", "What is the sample size?"].map((q) => (
              <button key={q} onClick={() => copilotMutation.mutate(q)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-600 transition-colors">
                {q}
              </button>
            ))}
          </div>

          {copilotMutation.isPending && <div className="p-4 text-sm text-slate-400 animate-pulse">Thinking...</div>}
          {copilotMutation.data && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: copilotMutation.data.answer?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") || "" }} />
              </div>
            </div>
          )}
          {copilotMutation.isError && (
            <div className="p-4 bg-red-50 rounded-lg text-sm text-red-600">Failed to get answer. Make sure you've run analysis first.</div>
          )}
        </div>
      )}
    </div>
  )
}
