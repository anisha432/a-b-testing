import { useAuth } from "../hooks/useAuth"
import { Settings, User, Shield, Bell, Palette } from "lucide-react"

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and workspace settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                  <input defaultValue={user?.full_name || ""} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm" readOnly />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                  <input defaultValue={user?.username || ""} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm" readOnly />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input defaultValue={user?.email || ""} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm" readOnly />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Experiment completion alerts", checked: true },
                { label: "Statistical significance alerts", checked: true },
                { label: "SRM detection warnings", checked: true },
                { label: "Weekly experiment summary", checked: false },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked={item.checked} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Security</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="text-slate-900 font-medium">{user?.is_superuser ? "Admin" : "User"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Account</span><span className="text-emerald-600 font-medium">Active</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">About</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Version</span><span className="text-slate-900">1.0.0</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Platform</span><span className="text-slate-900">ExperimentIQ</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Stats Engine</span><span className="text-slate-900">SciPy + statsmodels</span></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
            <h3 className="font-semibold mb-1">ExperimentIQ</h3>
            <p className="text-blue-100 text-xs">AI-Powered A/B Testing & Experimentation Intelligence Platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}
