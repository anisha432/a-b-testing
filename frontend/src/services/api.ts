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
  variants: (id: number) => request(`/api/v1/experiments/${id}/variants`),
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
    if (experimentId) formData.append("experiment_id", String(experimentId))
    return fetch(`${API_BASE}/api/v1/datasets/upload`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then((r) => r.json())
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
  business: (experimentId: number) => request(`/api/v1/analytics/business/${experimentId}`),
  copilot: (data: { query: string; experiment_id: number }) => request("/api/v1/analytics/copilot", { method: "POST", body: JSON.stringify(data) }),
  overview: () => request("/api/v1/analytics/overview"),
  monitor: () => request("/api/v1/analytics/monitor"),
}

// Reports
export const reportsApi = {
  list: () => request("/api/v1/reports"),
  create: (data: { experiment_id: number; title: string; report_type?: string }) => request("/api/v1/reports", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => request(`/api/v1/reports/${id}`),
  downloadUrl: (id: number) => `${API_BASE}/api/v1/reports/${id}/download`,
  delete: (id: number) => request(`/api/v1/reports/${id}`, { method: "DELETE" }),
}
