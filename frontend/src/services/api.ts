const API_BASE = import.meta.env.VITE_API_URL || ""

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token")
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json"

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => request("/api/v1/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data: { email: string; username: string; password: string; full_name?: string }) => request("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/api/v1/auth/me"),
}

// Experiments
export const experimentsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request(`/api/v1/experiments${qs}`)
  },
  get: (id: number) => request(`/api/v1/experiments/${id}`),
  create: (data: any) => request("/api/v1/experiments", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request(`/api/v1/experiments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/v1/experiments/${id}`, { method: "DELETE" }),
  complete: (id: number) => request(`/api/v1/experiments/${id}/complete`, { method: "POST" }),
  variants: (id: number) => request(`/api/v1/experiments/${id}/variants`),
  // Dataset management per experiment
  getDataset: (experimentId: number) => request(`/api/v1/experiments/${experimentId}/dataset`),
  uploadDataset: (experimentId: number, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return fetch(`${API_BASE}/api/v1/experiments/${experimentId}/upload-dataset`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then((r) => {
      if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || "Upload failed") })
      return r.json()
    })
  },
  attachDataset: (experimentId: number, datasetId: number) =>
    request(`/api/v1/experiments/${experimentId}/attach-dataset/${datasetId}`, { method: "POST" }),
  detachDataset: (experimentId: number) =>
    request(`/api/v1/experiments/${experimentId}/detach-dataset`, { method: "DELETE" }),
}

// Datasets
export const datasetsApi = {
  list: (experimentId?: number) => {
    const qs = experimentId ? `?experiment_id=${experimentId}` : ""
    return request(`/api/v1/datasets${qs}`)
  },
  get: (id: number) => request(`/api/v1/datasets/${id}`),
  upload: (file: File, experimentId?: number) => {
    const formData = new FormData()
    formData.append("file", file)
    const qs = experimentId ? `?experiment_id=${experimentId}` : ""
    return fetch(`${API_BASE}/api/v1/datasets/upload${qs}`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then((r) => {
      if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || "Upload failed") })
      return r.json()
    })
  },
  preview: (id: number, page = 1, pageSize = 50) => request(`/api/v1/datasets/${id}/preview?page=${page}&page_size=${pageSize}`),
  quality: (id: number) => request(`/api/v1/datasets/${id}/quality`),
  updateMapping: (id: number, mappings: Record<string, string>) => request(`/api/v1/datasets/${id}/mapping`, { method: "PUT", body: JSON.stringify({ column_mappings: mappings }) }),
  delete: (id: number) => request(`/api/v1/datasets/${id}`, { method: "DELETE" }),
}

// Analytics
export const analyticsApi = {
  runAnalysis: (experimentId: number, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return request(`/api/v1/analytics/run/${experimentId}${qs}`, { method: "POST" })
  },
  results: (experimentId: number) => request(`/api/v1/analytics/results/${experimentId}`),
  segments: (experimentId: number) => request(`/api/v1/analytics/segments/${experimentId}`),
  health: (experimentId: number) => request(`/api/v1/analytics/health/${experimentId}`),
  business: (experimentId: number, params?: { monthlyRevenuePerUser?: number; dailyUsers?: number }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [
          k === "monthlyRevenuePerUser" ? "monthly_revenue_per_user"
            : k === "dailyUsers" ? "daily_users"
            : k,
          String(v),
        ])
    ).toString() : ""
    return request(`/api/v1/analytics/business/${experimentId}${qs}`)
  },
  copilot: (data: { query: string; experiment_id: number }) => request("/api/v1/analytics/copilot", { method: "POST", body: JSON.stringify(data) }),
  overview: () => request("/api/v1/analytics/overview"),
  monitor: () => request("/api/v1/analytics/monitor"),
  insights: () => request("/api/v1/analytics/insights"),
}

// Reports
export const reportsApi = {
  list: () => request("/api/v1/reports"),
  create: (data: { experiment_id: number; title: string; report_type?: string }) => request("/api/v1/reports", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => request(`/api/v1/reports/${id}`),
  downloadUrl: (id: number) => `${API_BASE}/api/v1/reports/${id}/download`,
  download: async (id: number, filename: string) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_BASE}/api/v1/reports/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error("Download failed")
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  },
  delete: (id: number) => request(`/api/v1/reports/${id}`, { method: "DELETE" }),
}
