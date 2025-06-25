import React from "react"
import { useRouteError, isRouteErrorResponse } from "react-router"
import { AlertTriangle, ExternalLink, Home, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function RouterErrorBoundary() {
  const error = useRouteError()

  const getErrorMessage = () => {
    if (isRouteErrorResponse(error)) {
      return `${error.status} ${error.statusText}`
    }
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === "string") {
      return error
    }
    return "Unknown routing error"
  }

  const getErrorDetails = () => {
    if (isRouteErrorResponse(error)) {
      return {
        type: "Route Error",
        status: error.status,
        statusText: error.statusText,
        data: error.data,
      }
    }
    if (error instanceof Error) {
      return {
        type: "Navigation Error",
        message: error.message,
        stack: error.stack,
      }
    }
    return {
      type: "Unknown Error",
      details: String(error),
    }
  }

  const handleGoHome = () => {
    window.location.href = "/"
  }

  const handleReload = () => {
    window.location.reload()
  }

  const handleReportIssue = () => {
    const errorDetails = getErrorDetails()
    const issueTitle = encodeURIComponent(
      `Routing Error: ${getErrorMessage()}`
    )
    
    let errorInfo = ""
    if (isRouteErrorResponse(error)) {
      errorInfo = `**Route Error Response:**
- Status: ${error.status}
- Status Text: ${error.statusText}
- Data: ${JSON.stringify(error.data, null, 2)}`
    } else if (error instanceof Error) {
      errorInfo = `**Error Message:**
\`${error.message}\`

**Stack Trace:**
\`\`\`
${error.stack || "No stack trace available"}
\`\`\``
    } else {
      errorInfo = `**Error Details:**
\`${String(error)}\``
    }

    const issueBody = encodeURIComponent(
      `## Routing Error Report

${errorInfo}

**Browser Information:**
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}
- Timestamp: ${new Date().toISOString()}

**Steps to Reproduce:**
1. [Please describe the navigation or routing action that led to this error]

**Expected Behavior:**
[Please describe what you expected to happen during navigation]

**Actual Behavior:**
The routing failed with the error shown above.`
    )

    const issueURL = `https://github.com/ditto-assistant/ditto-app/issues/new?title=${issueTitle}&body=${issueBody}&labels=bug,routing`
    window.open(issueURL, "_blank", "noopener,noreferrer")
  }

  console.error("Router error caught:", error)

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
              Page Not Found
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              {isRouteErrorResponse(error) && error.status === 404
                ? "The page you're looking for doesn't exist."
                : "We encountered a navigation error. Let's get you back on track."}
            </p>
          </div>

          {/* Error Message */}
          <div className="bg-muted/50 px-4 py-2 rounded-md border">
            <p className="text-sm font-medium text-foreground">
              {getErrorMessage()}
            </p>
          </div>

          {/* Error Details (Collapsible) */}
          <details className="w-full max-w-lg">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              View technical details
            </summary>
            <div className="mt-3 p-4 bg-muted/50 rounded-md border text-left">
              <div className="space-y-2 text-sm font-mono">
                {Object.entries(getErrorDetails()).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-semibold text-destructive capitalize">
                      {key}:
                    </span>
                    <p className="text-muted-foreground break-all">
                      {typeof value === "object" 
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </details>

          <Separator className="bg-border/50" />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <Button
              onClick={handleGoHome}
              className={cn(
                "flex-1 gap-2 bg-primary/90 hover:bg-primary text-primary-foreground",
                "transition-all duration-200 hover:shadow-[0_0_15px_rgba(29,78,216,0.3)]",
                "active:scale-[0.98] cursor-pointer"
              )}
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>

            <Button
              onClick={handleReload}
              variant="outline"
              className={cn(
                "flex-1 gap-2 border-border/60 hover:bg-muted/60",
                "transition-all duration-200 active:scale-[0.98] cursor-pointer"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Retry
            </Button>
          </div>

          <Separator className="bg-border/30" />

          {/* Report Issue Section */}
          <div className="flex flex-col items-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Help us improve Ditto by reporting this routing error
            </p>
            <Button
              onClick={handleReportIssue}
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

export default RouterErrorBoundary