import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { toStr, toLowerCase } from "./safe"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safely format a number with K/M suffixes. Never crashes on undefined/null. */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || typeof n !== "number" || !Number.isFinite(n)) return "—"
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K"
  try {
    return n.toLocaleString()
  } catch {
    return String(n)
  }
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null || typeof n !== "number" || !Number.isFinite(n)) return "—"
  return n.toFixed(2) + "%"
}

export function formatCurrency(n: number | null | undefined): string {
  if (n == null || typeof n !== "number" || !Number.isFinite(n)) return "—"
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
  } catch {
    return "$" + String(Math.round(n))
  }
}

/** Safely format a date string. Never throws. */
export function formatDate(d: string | null | undefined): string {
  if (!d || typeof d !== "string") return "—"
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return "—"
  }
}

/** Safely return Tailwind classes for experiment status. */
export function getStatusColor(status: string | null | undefined): string {
  const s = toLowerCase(status)
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    running: "bg-blue-100 text-blue-700",
    paused: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    archived: "bg-gray-100 text-gray-500",
  }
  return colors[s] || "bg-gray-100 text-gray-500"
}

/** Safely return Tailwind classes for alert type. */
export function getAlertColor(type: string | null | undefined): string {
  const s = toStr(type)
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
    healthy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }
  return colors[s] || "bg-gray-100 text-gray-500"
}
