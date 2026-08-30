import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Beaker, Eye, EyeOff } from "lucide-react"

export function LoginPage() {
  const [email, setEmail] = useState("admin@experimentiq.com")
  const [password, setPassword] = useState("admin123")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate("/")
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Beaker className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">ExperimentIQ</h1>
          <p className="text-slate-500 mt-1">AI-Powered A/B Testing Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Create account
            </Link>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
            Demo: admin@experimentiq.com / admin123
          </div>
        </div>
      </div>
    </div>
  )
}
