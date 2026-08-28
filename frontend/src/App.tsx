import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppLayout } from "./layouts/AppLayout"
import { OverviewPage } from "./pages/OverviewPage"
import { ExperimentsPage } from "./pages/ExperimentsPage"
import { ExperimentDetailPage } from "./pages/ExperimentDetailPage"
import { NewExperimentPage } from "./pages/NewExperimentPage"
import { DataLabPage } from "./pages/DataLabPage"
import { AnalyticsPage } from "./pages/AnalyticsPage"
import { SegmentsPage } from "./pages/SegmentsPage"
import { BusinessImpactPage } from "./pages/BusinessImpactPage"
import { InsightsPage } from "./pages/InsightsPage"
import { MonitorPage } from "./pages/MonitorPage"
import { ReportsPage } from "./pages/ReportsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { LoginPage } from "./pages/LoginPage"
import { AuthProvider, useAuth } from "./hooks/useAuth"

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="experiments" element={<ExperimentsPage />} />
              <Route path="experiments/new" element={<NewExperimentPage />} />
              <Route path="experiments/:id" element={<ExperimentDetailPage />} />
              <Route path="data-lab" element={<DataLabPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="segments" element={<SegmentsPage />} />
              <Route path="business-impact" element={<BusinessImpactPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="monitor" element={<MonitorPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
