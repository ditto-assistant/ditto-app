import React, { Component, createContext, useContext, useState } from "react"
import { handleLazyLoadError } from "@/utils/updateService"

// Error boundary context
interface ErrorBoundaryContextType {
  hasError: boolean
  isOutdated: boolean
  resetError: () => void
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType>({
  hasError: false,
  isOutdated: false,
  resetError: () => {},
})

// Error boundary for catching lazy loading errors
class LazyLoadErrorBoundary extends Component<
  {
    children: React.ReactNode
    onError: (error: Error, isOutdated: boolean) => void
  },
  { hasError: boolean; isOutdated: boolean }
> {
  state = {
    hasError: false,
    isOutdated: false,
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    // Check if error is related to outdated app version
    const isOutdated = handleLazyLoadError(error)
    this.setState({ isOutdated })
    this.props.onError(error, isOutdated)
  }

  resetError = () => {
    this.setState({ hasError: false, isOutdated: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryContext.Provider
          value={{
            hasError: this.state.hasError,
            isOutdated: this.state.isOutdated,
            resetError: this.resetError,
          }}
        >
          {this.props.children}
        </ErrorBoundaryContext.Provider>
      )
    }

    return (
      <ErrorBoundaryContext.Provider
        value={{
          hasError: this.state.hasError,
          isOutdated: this.state.isOutdated,
          resetError: this.resetError,
        }}
      >
        {this.props.children}
      </ErrorBoundaryContext.Provider>
    )
  }
}

// Hook for component errors
export const useLazyLoadErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null)
  const [isOutdated, setIsOutdated] = useState(false)

  const handleError = (err: Error, outdated: boolean) => {
    console.error("Lazy loading error:", err)
    setError(err)
    setIsOutdated(outdated)
  }

  const resetError = () => {
    setError(null)
    setIsOutdated(false)
  }

  const ErrorBoundaryWrapper = ({
    children,
  }: {
    children: React.ReactNode
  }) => (
    <LazyLoadErrorBoundary onError={handleError}>
      {children}
    </LazyLoadErrorBoundary>
  )

  return {
    error,
    isOutdated,
    resetError,
    ErrorBoundaryWrapper,
    useErrorBoundaryContext: () => useContext(ErrorBoundaryContext),
  }
}

export default useLazyLoadErrorHandler
