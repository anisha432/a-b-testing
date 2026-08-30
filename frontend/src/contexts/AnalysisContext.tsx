import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { experimentsApi, datasetsApi } from "../services/api"

interface ActiveDataset {
  id: number
  original_filename: string
  row_count: number
  column_count: number
  quality_score: number | null
  experiment_id: number | null
  created_at: string
  status: string
}

interface ActiveExperiment {
  id: number
  name: string
  status: string
  experiment_type: string
  primary_metric: string | null
}

interface AnalysisContextType {
  activeDatasetId: number | null
  activeExperimentId: number | null
  activeDataset: ActiveDataset | null
  activeExperiment: ActiveExperiment | null
  isLoading: boolean
  activateDataset: (datasetId: number, experimentId?: number) => void
  clearContext: () => void
  hasContext: boolean
  hasDataset: boolean
  hasExperiment: boolean
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

const STORAGE_KEY = "experimentiq_active_context"

function loadPersistedContext(): { datasetId: number | null; experimentId: number | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { datasetId: parsed.datasetId || null, experimentId: parsed.experimentId || null }
    }
  } catch {}
  return { datasetId: null, experimentId: null }
}

function savePersistedContext(datasetId: number | null, experimentId: number | null) {
  if (datasetId) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ datasetId, experimentId }))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersistedContext()
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(persisted.datasetId)
  const [activeExperimentId, setActiveExperimentId] = useState<number | null>(persisted.experimentId)
  const [activeDataset, setActiveDataset] = useState<ActiveDataset | null>(null)
  const [activeExperiment, setActiveExperiment] = useState<ActiveExperiment | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Validate and load details when IDs change
  useEffect(() => {
    if (!activeDatasetId) {
      setActiveDataset(null)
      setActiveExperiment(null)
      setActiveDatasetId(null)
      setActiveExperimentId(null)
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    let cancelled = false
    setIsLoading(true)

    datasetsApi.get(activeDatasetId).then((ds: any) => {
      if (cancelled) return

      if (!ds) {
        // Dataset no longer exists — clear context
        setActiveDataset(null)
        setActiveExperiment(null)
        setActiveDatasetId(null)
        setActiveExperimentId(null)
        localStorage.removeItem(STORAGE_KEY)
        setIsLoading(false)
        return
      }

      setActiveDataset(ds)

      // If dataset has an experiment attached, load the experiment
      const expId = ds.experiment_id || activeExperimentId
      if (expId) {
        setActiveExperimentId(expId)
        experimentsApi.get(expId).then((exp: any) => {
          if (cancelled) return
          if (exp) {
            setActiveExperiment(exp)
            savePersistedContext(activeDatasetId, expId)
          } else {
            setActiveExperiment(null)
            savePersistedContext(activeDatasetId, null)
          }
          setIsLoading(false)
        }).catch(() => {
          if (!cancelled) {
            setActiveExperiment(null)
            savePersistedContext(activeDatasetId, null)
            setIsLoading(false)
          }
        })
      } else {
        setActiveExperiment(null)
        setActiveExperimentId(null)
        savePersistedContext(activeDatasetId, null)
        setIsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setActiveDataset(null)
        setActiveExperiment(null)
        setActiveDatasetId(null)
        setActiveExperimentId(null)
        localStorage.removeItem(STORAGE_KEY)
        setIsLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [activeDatasetId])

  const activateDataset = useCallback((datasetId: number, experimentId?: number) => {
    setActiveDatasetId(datasetId)
    if (experimentId) {
      setActiveExperimentId(experimentId)
    }
  }, [])

  const clearContext = useCallback(() => {
    setActiveDatasetId(null)
    setActiveExperimentId(null)
    setActiveDataset(null)
    setActiveExperiment(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AnalysisContext.Provider
      value={{
        activeDatasetId,
        activeExperimentId,
        activeDataset,
        activeExperiment,
        isLoading,
        activateDataset,
        clearContext,
        hasContext: !!activeDatasetId,
        hasDataset: !!activeDataset,
        hasExperiment: !!activeExperiment,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysisContext() {
  const context = useContext(AnalysisContext)
  if (!context) throw new Error("useAnalysisContext must be used within AnalysisProvider")
  return context
}
