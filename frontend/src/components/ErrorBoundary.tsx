import React from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-800">Something went wrong</div>
              <p className="text-xs text-red-600 mt-1">
                {this.state.error?.message || "An unexpected error occurred while rendering this component."}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
