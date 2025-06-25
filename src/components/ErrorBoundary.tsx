import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, ExternalLink, RefreshCw, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReportIssue = () => {
    const { error, errorInfo } = this.state
    const issueTitle = encodeURIComponent(
      `Bug Report: ${error?.message || "Unexpected Error"}`
    )
    const issueBody = encodeURIComponent(
      `## Bug Report

**Error Message:**
\`${error?.message || "Unknown error"}\`

**Stack Trace:**
\`\`\`
${error?.stack || "No stack trace available"}
\`\`\`

**Component Stack:**
\`\`\`
${errorInfo?.componentStack || "No component stack available"}
\`\`\`

**Browser Information:**
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}
- Timestamp: ${new Date().toISOString()}

**Steps to Reproduce:**
1. [Please describe the steps that led to this error]

**Expected Behavior:**
[Please describe what you expected to happen]

**Actual Behavior:**
The application crashed with the error shown above.`
    )

    const issueURL = `https://github.com/ditto-assistant/ditto-app/issues/new?title=${issueTitle}&body=${issueBody}&labels=bug`
    window.open(issueURL, "_blank", "noopener,noreferrer")
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl p-8 border-destructive/20 bg-gradient-to-b from-background to-muted/20">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Error Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl scale-150" />
                <div className="relative bg-destructive/10 p-4 rounded-full border border-destructive/30">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>

              {/* Error Title */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  Oops! Something went wrong
                </h1>
                <p className="text-lg text-muted-foreground max-w-md">
                  We encountered an unexpected error. Don&apos;t worry, your
                  data is safe.
                </p>
              </div>

              {/* Error Details (Collapsible) */}
              {this.state.error && (
                <details className="w-full max-w-lg">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                    View technical details
                  </summary>
                  <div className="mt-3 p-4 bg-muted/50 rounded-md border text-left">
                    <div className="space-y-2 text-sm font-mono">
                      <div>
                        <span className="font-semibold text-destructive">
                          Error:
                        </span>
                        <p className="text-muted-foreground break-all">
                          {this.state.error.message}
                        </p>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <span className="font-semibold text-destructive">
                            Stack:
                          </span>
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}

              <Separator className="bg-border/50" />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button
                  onClick={this.handleReset}
                  className={cn(
                    "flex-1 gap-2 bg-primary/90 hover:bg-primary text-primary-foreground",
                    "transition-all duration-200 hover:shadow-[0_0_15px_rgba(29,78,216,0.3)]",
                    "active:scale-[0.98] cursor-pointer"
                  )}
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className={cn(
                    "flex-1 gap-2 border-border/60 hover:bg-muted/60",
                    "transition-all duration-200 active:scale-[0.98] cursor-pointer"
                  )}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              <Separator className="bg-border/30" />

              {/* Report Issue Section */}
              <div className="flex flex-col items-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Help us improve Ditto by reporting this error
                </p>
                <Button
                  onClick={this.handleReportIssue}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 bg-secondary/40 hover:bg-secondary/60 border-secondary/50",
                    "text-secondary-foreground transition-all duration-200",
                    "hover:shadow-[0_0_15px_rgba(148,163,184,0.2)] active:scale-95 cursor-pointer"
                  )}
                >
                  <Bug className="h-4 w-4" />
                  Report Issue
                  <ExternalLink className="h-3 w-3 ml-1 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:translate-y-[-0.5px]" />
                </Button>
              </div>

              {/* Footer */}
              <div className="text-xs text-muted-foreground/60 pt-4">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

export default ErrorBoundary
