import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { experimentsApi } from "../services/api"
import { FlaskConical } from "lucide-react"

export function NewExperimentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: "",
    description: "",
    hypothesis: "",
    owner: "",
    experiment_type: "conversion",
    primary_metric: "",
    target_audience: "",
    expected_uplift: "",
    control_allocation: "50",
    treatment_allocation: "50",
    start_date: "",
    end_date: "",
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => experimentsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      navigate(`/experiments/${data.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      expected_uplift: form.expected_uplift ? parseFloat(form.expected_uplift) : null,
      control_allocation: parseFloat(form.control_allocation),
      treatment_allocation: parseFloat(form.treatment_allocation),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })
  }

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Experiment</h1>
        <p className="text-slate-500 text-sm mt-1">Create a new A/B test experiment</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Experiment Name *</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., Checkout Flow Optimization" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="What are you testing?" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hypothesis</label>
          <textarea value={form.hypothesis} onChange={(e) => update("hypothesis", e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="If we [change], then [metric] will [improve/decrease] because [reason]." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
            <input value={form.owner} onChange={(e) => update("owner", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Experiment owner" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Experiment Type</label>
            <select value={form.experiment_type} onChange={(e) => update("experiment_type", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="conversion">Conversion</option>
              <option value="revenue">Revenue</option>
              <option value="engagement">Engagement</option>
              <option value="retention">Retention</option>
              <option value="performance">Performance</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Metric</label>
            <input value={form.primary_metric} onChange={(e) => update("primary_metric", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g., conversion_rate" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Uplift (%)</label>
            <input type="number" step="0.1" value={form.expected_uplift} onChange={(e) => update("expected_uplift", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="10" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
          <input value={form.target_audience} onChange={(e) => update("target_audience", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g., All users who reach checkout" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Control Allocation (%)</label>
            <input type="number" min="1" max="99" value={form.control_allocation} onChange={(e) => update("control_allocation", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Treatment Allocation (%)</label>
            <input type="number" min="1" max="99" value={form.treatment_allocation} onChange={(e) => update("treatment_allocation", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {createMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {(createMutation.error as Error)?.message || "Failed to create experiment"}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors">
            {createMutation.isPending ? "Creating..." : "Create Experiment"}
          </button>
          <button type="button" onClick={() => navigate("/experiments")} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
