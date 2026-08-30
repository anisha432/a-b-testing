import { useState } from "react"
import { Outlet, NavLink, useLocation } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { ActiveContextBar } from "../components/ActiveContextBar"
import {
  LayoutDashboard, FlaskConical, Plus, Database, BarChart3,
  Users, TrendingUp, Lightbulb, Monitor, FileText, Settings,
  Search, Bell, ChevronLeft, ChevronRight, LogOut, Beaker
} from "lucide-react"

const navSections = [
  {
    title: "Workspace",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Overview" },
      { to: "/experiments", icon: FlaskConical, label: "Experiments" },
      { to: "/experiments/new", icon: Plus, label: "New Experiment" },
      { to: "/data-lab", icon: Database, label: "Data Lab" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/segments", icon: Users, label: "Segments" },
      { to: "/business-impact", icon: TrendingUp, label: "Business Impact" },
      { to: "/insights", icon: Lightbulb, label: "Insights" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/monitor", icon: Monitor, label: "Monitor" },
      { to: "/reports", icon: FileText, label: "Reports" },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
]

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} flex flex-col bg-white border-r border-slate-200 transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
            <Beaker className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-slate-900 text-lg tracking-tight">ExperimentIQ</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && <div className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{section.title}</div>}
              {section.items.map((item) => {
                const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-slate-200 text-slate-400 hover:text-slate-600"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search experiments..." className="bg-transparent text-sm outline-none w-48 placeholder:text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-slate-900">{user?.full_name || user?.username}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400" title="Log out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Active Analysis Context */}
        <ActiveContextBar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
