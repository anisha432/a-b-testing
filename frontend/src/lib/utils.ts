import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K"
  return n.toLocaleString()
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toFixed(2) + "%"
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    running: "bg-blue-100 text-blue-700",
    paused: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    archived: "bg-gray-100 text-gray-500",
  }
  return colors[status] || "bg-gray-100 text-gray-500"
}

export function getAlertColor(type: string): string {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
    healthy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }
  return colors[type] || "bg-gray-100 text-gray-500"
}
