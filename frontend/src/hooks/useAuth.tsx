import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { authApi } from "../services/api"

interface AuthContextType {
  user: any | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      authApi.me().then((data) => setUser(data)).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    localStorage.setItem("token", data.access_token)
    setUser(data.user)
  }

  const register = async (email: string, username: string, password: string) => {
    const data = await authApi.register({ email, username, password })
    localStorage.setItem("token", data.access_token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
