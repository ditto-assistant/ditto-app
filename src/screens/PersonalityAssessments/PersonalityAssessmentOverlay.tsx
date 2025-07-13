import { useCallback, useEffect, useState } from "react"
import {
  Brain,
  TrendingUp,
  User,
  Award,
  X as LucideX,
  RefreshCw,
  MessageSquare,
  Clock,
  Sparkles,
  Zap,
  ChevronRight,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  Timer,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePersonalityAssessments } from "./hooks/usePersonalityAssessments"
import { useMemoryCount } from "@/hooks/useMemoryCount"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import BigFiveResults from "./components/BigFiveResults"
import MBTIResults from "./components/MBTIResults"
import DISCResults from "./components/DISCResults"
import { routes } from "@/firebaseConfig"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore"

interface PersonalityAssessment {
  assessment_id: string
  session_id: string
  name: string
  description: string
  completed_at: string | null
  results: any
  answers: any
  questions_answered: number
  started_at: number
  completed: boolean
}

interface LastSyncStatus {
  can_sync: boolean
  last_sync_time: string | null
  hours_until_next_sync: number
  reason: string
  is_processing?: boolean
  status?: string
}

export default function PersonalityAssessmentOverlay() {
  const { user } = useAuth()
  const { count: messageCount, loading: memoryCountLoading } = useMemoryCount()
  const { assessments, loading, error, refetch, updateAssessments } =
    usePersonalityAssessments(user?.uid)
  const [selectedAssessment, setSelectedAssessment] =
    useState<PersonalityAssessment | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [lastSyncStatus, setLastSyncStatus] = useState<LastSyncStatus | null>(
    null
  )
  const [loadingLastSync, setLoadingLastSync] = useState(false)

  // Use memory count from the dedicated hook
  const hasEnoughMessages = messageCount >= 30

  const pollForCompletion = useCallback(
    async (initialLastSyncTime: string | null) => {
      if (!user?.uid) return

      let pollCount = 0
      const maxPolls = 60 // 5 minutes max

      const poll = async () => {
        try {
          const token = await user.getIdToken()
          const response = await fetch(routes.personalityLastSync, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          })

          if (response.ok) {
            const data = await response.json()

            // Check if sync is no longer processing (completion detection)
            if (!data.is_processing) {
              // Sync completed!
              setSyncStatus("Personality sync completed successfully!")
              setLastSyncStatus(data)

              // Force refresh assessments from API and update localStorage
              refetch()

              setTimeout(() => {
                setIsSyncing(false)
                setSyncStatus(null)
              }, 2000)
              return
            }

            // Update status message based on current state
            setSyncStatus(
              "AI personality sync in progress. You can close the app and check back later!"
            )
          }

          pollCount++
          if (pollCount < maxPolls) {
            setTimeout(poll, 5000) // Poll every 5 seconds
          } else {
            console.warn("Personality sync polling timeout reached")
            setSyncStatus(
              "AI personality sync in progress. You can close the app and check back later!"
            )
            setTimeout(() => {
              setIsSyncing(false)
              setSyncStatus(null)
            }, 3000)
          }
        } catch (error) {
          console.error("Error polling for completion:", error)
          setSyncStatus("AI personality sync in progress. You can close the app and check back later!")
          setTimeout(() => {
            setIsSyncing(false)
            setSyncStatus(null)
          }, 2000)
        }
      }

      // Start polling after a short delay
      setTimeout(poll, 3000)
    },
    [user, refetch]
  )

  const fetchLastSyncStatus = useCallback(async () => {
    if (!user?.uid) return

    setLoadingLastSync(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(routes.personalityLastSync, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        setLastSyncStatus(data)

        // IMMEDIATELY set syncing state based on backend response
        if (data.is_processing) {
          setIsSyncing(true)
          setSyncStatus(
            "AI personality sync in progress. You can close the app and check back later!"
          )
          // Always start polling when we detect an active sync
          pollForCompletion(data.last_sync_time)
        } else {
          // If backend says no sync in progress, clear syncing state
          setIsSyncing(false)
          setSyncStatus(null)
        }
      } else {
        console.error("Failed to fetch last sync status")
      }
    } catch (error) {
      console.error("Error fetching last sync status:", error)
    } finally {
      setLoadingLastSync(false)
    }
  }, [user, pollForCompletion])

  // Real-time Firestore listener for instant sync status updates
  useEffect(() => {
    if (!user?.uid) return

    const personalitySyncRef = doc(db, "personality_sync_jobs", user.uid)
    const unsubscribe = onSnapshot(personalitySyncRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data()

        // Update UI state immediately based on Firestore data
        if (data.status === "processing") {
          setIsSyncing(true)
          setSyncStatus(
            "AI personality sync in progress. You can close the app and check back later!"
          )

          // Update lastSyncStatus
          setLastSyncStatus({
            can_sync: false,
            last_sync_time:
              data.started_at?.toDate?.()?.toISOString() ||
              new Date().toISOString(),
            hours_until_next_sync: 24,
            reason: "Sync in progress",
            is_processing: true,
            status: "processing",
          })

          // Start polling if not already started
          if (!isSyncing) {
            pollForCompletion(
              data.started_at?.toDate?.()?.toISOString() || null
            )
          }
        } else if (data.status === "completed") {
          setIsSyncing(false)
          setSyncStatus("Personality sync completed successfully!")

          // Force refresh assessments from API and update localStorage
          refetch()

          // Clear status after delay
          setTimeout(() => {
            setSyncStatus(null)
          }, 2000)
        } else if (data.status === "error") {
          console.error("Personality sync error:", data.message)
          setIsSyncing(false)
          setSyncStatus(null)
          toast.error(data.message || "Personality sync failed")
        }
      } else {
        setIsSyncing(false)
        setSyncStatus(null)
      }
    })

    // Also fetch initial status from backend
    fetchLastSyncStatus()

    return () => {
      unsubscribe()
    }
  }, [user?.uid, fetchLastSyncStatus, pollForCompletion, refetch])

  const handleRefresh = useCallback(() => {
    refetch()
    fetchLastSyncStatus()
    toast.success("Refreshed personality assessments")
  }, [refetch, fetchLastSyncStatus])

  const handleStartAssessment = useCallback(async () => {
    if (!user?.uid) {
      toast.error("Please log in to start personality assessment")
      return
    }

    if (!hasEnoughMessages) {
      toast.error(
        `You need at least 30 memories to compute your personality. You currently have ${messageCount}.`
      )
      return
    }

    // Check rate limiting
    if (lastSyncStatus && !lastSyncStatus.can_sync) {
      toast.error(
        `You can sync again in ${lastSyncStatus.hours_until_next_sync.toFixed(1)} hours`
      )
      return
    }

    // Prevent starting if already in progress
    if (isSyncing) {
      toast.info("Sync is already in progress")
      return
    }

    try {
      // STEP 1: Write to Firestore IMMEDIATELY (frontend-driven)
      const personalitySyncRef = doc(db, "personality_sync_jobs", user.uid)
      await setDoc(personalitySyncRef, {
        status: "processing",
        started_at: serverTimestamp(),
        last_updated: serverTimestamp(),
        message:
          "AI personality sync in progress. You can close the app and check back later!",
        user_id: user.uid,
        frontend_initiated: true,
      })

      // STEP 2: Update UI state immediately (since we know document exists)
      setIsSyncing(true)
      setSyncStatus(
        "AI personality sync in progress. You can close the app and check back later!"
      )

      // Update lastSyncStatus immediately
      setLastSyncStatus({
        can_sync: false,
        last_sync_time: new Date().toISOString(),
        hours_until_next_sync: 24,
        reason: "Sync in progress",
        is_processing: true,
        status: "processing",
      })

      // STEP 3: Start polling immediately (no delay needed)
      pollForCompletion(new Date().toISOString())

      // STEP 4: Now call the backend API (backend will find existing document)
      const token = await user.getIdToken()

      const response = await fetch(routes.personalityAssessmentStart, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.uid,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Failed to start personality sync:", errorData)

        // Clean up Firestore document on API failure
        await setDoc(personalitySyncRef, {
          status: "error",
          message: `Backend error: ${errorData.error || "Failed to start sync"}`,
          last_updated: serverTimestamp(),
          error: errorData.error || "Failed to start sync",
        })

        throw new Error(errorData.error || "Failed to start sync")
      }
    } catch (error) {
      console.error("Failed to start personality assessment:", error)

      // Clean up on error
      setIsSyncing(false)
      setSyncStatus(null)

      // Try to update Firestore document with error
      try {
        const personalitySyncRef = doc(db, "personality_sync_jobs", user.uid)
        await setDoc(personalitySyncRef, {
          status: "error",
          message: `Error: ${error instanceof Error ? error.message : "Failed to start sync"}`,
          last_updated: serverTimestamp(),
          error:
            error instanceof Error ? error.message : "Failed to start sync",
        })
      } catch (cleanupError) {
        console.error("Failed to cleanup Firestore document:", cleanupError)
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to start sync"
      )
    }
  }, [
    user,
    hasEnoughMessages,
    messageCount,
    isSyncing,
    lastSyncStatus,
    pollForCompletion,
  ])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatLastSyncTime = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getAssessmentIcon = (assessmentId: string) => {
    switch (assessmentId) {
      case "big-five":
        return <TrendingUp className="h-6 w-6" />
      case "mbti":
        return <User className="h-6 w-6" />
      case "disc":
        return <Award className="h-6 w-6" />
      default:
        return <Brain className="h-6 w-6" />
    }
  }

  const getAssessmentGradient = (assessmentId: string) => {
    switch (assessmentId) {
      case "big-five":
        return "from-blue-500 to-blue-600"
      case "mbti":
        return "from-purple-500 to-purple-600"
      case "disc":
        return "from-green-500 to-green-600"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const getAssessmentBadgeColor = (assessmentId: string) => {
    switch (assessmentId) {
      case "big-five":
        return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700"
      case "mbti":
        return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700"
      case "disc":
        return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getShortDescription = (assessmentId: string) => {
    switch (assessmentId) {
      case "big-five":
        return "Five key personality dimensions"
      case "mbti":
        return "16 personality types based on preferences"
      case "disc":
        return "Four behavioral styles for work & life"
      default:
        return "Personality assessment"
    }
  }

  // Pentagon radar chart component for Big Five
  const BigFivePentagon = ({ results }: { results: any }) => {
    const dimensions = Object.entries(results.dimension_scores || {})
    const size = 120
    const center = size / 2
    const radius = 35

    const getPolygonPoints = (scores: number[]) => {
      return scores
        .map((score, index) => {
          const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2
          const value = (score / 5) * radius
          const x = center + value * Math.cos(angle)
          const y = center + value * Math.sin(angle)
          return `${x},${y}`
        })
        .join(" ")
    }

    const getOutlinePoints = () => {
      const points = []
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
        const x = center + radius * Math.cos(angle)
        const y = center + radius * Math.sin(angle)
        points.push(`${x},${y}`)
      }
      return points.join(" ")
    }

    const getDimensionLabel = (key: string) => {
      const labels: { [key: string]: string } = {
        openness: "O",
        conscientiousness: "C",
        extraversion: "E",
        agreeableness: "A",
        neuroticism: "N",
      }
      return labels[key] || key.charAt(0).toUpperCase()
    }

    const scores = dimensions.map(([_, dim]: [string, any]) => dim.score)

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size} className="drop-shadow-sm">
          {/* Grid lines */}
          <polygon
            points={getOutlinePoints()}
            fill="none"
            stroke="rgb(203 213 225)"
            strokeWidth="1"
            className="opacity-30"
          />

          {/* Data polygon */}
          <polygon
            points={getPolygonPoints(scores)}
            fill="rgb(59 130 246)"
            fillOpacity="0.3"
            stroke="rgb(59 130 246)"
            strokeWidth="2"
          />

          {/* Dimension labels */}
          {dimensions.map(([key, dim]: [string, any], index) => {
            const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2
            const labelRadius = radius + 15
            const x = center + labelRadius * Math.cos(angle)
            const y = center + labelRadius * Math.sin(angle)

            return (
              <text
                key={key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-medium fill-current"
              >
                {getDimensionLabel(key)}
              </text>
            )
          })}

          {/* Center dot */}
          <circle cx={center} cy={center} r="2" fill="rgb(59 130 246)" />
        </svg>

        <div className="flex flex-wrap gap-1 justify-center text-xs">
          {dimensions.map(([key, dim]: [string, any]) => (
            <Badge
              key={key}
              variant="outline"
              className="text-xs px-1.5 py-0.5"
            >
              {getDimensionLabel(key)}: {dim.score.toFixed(1)}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  const renderInlineResults = (assessment: PersonalityAssessment) => {
    switch (assessment.assessment_id) {
      case "big-five":
        return (
          <div className="flex items-center justify-between">
            <BigFivePentagon results={assessment.results} />
            <div className="flex-1 ml-4">
              <h4 className="font-medium text-sm mb-2">Top Traits</h4>
              <div className="space-y-1">
                {Object.entries(assessment.results?.dimension_scores || {})
                  .sort(
                    ([, a]: [string, any], [, b]: [string, any]) =>
                      b.score - a.score
                  )
                  .slice(0, 3)
                  .map(([key, dim]: [string, any]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">{key}</span>
                      <Badge variant="outline" className="text-xs">
                        {dim.score.toFixed(1)}/5
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )

      case "mbti":
        return (
          <div className="text-center">
            <div className="mb-3">
              <Badge
                variant="outline"
                className="text-2xl font-bold py-2 px-4 bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700"
              >
                {assessment.results?.personality_type || "N/A"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(assessment.results?.dimension_details || {}).map(
                ([key, details]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="uppercase">{key}</span>
                    <Badge variant="outline" className="text-xs">
                      {details.preference} ({details.strength}%)
                    </Badge>
                  </div>
                )
              )}
            </div>
          </div>
        )

      case "disc":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700"
              >
                Primary:{" "}
                {assessment.results?.primary_style?.id.toUpperCase() || "N/A"}
              </Badge>
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700"
              >
                Secondary:{" "}
                {assessment.results?.secondary_style?.id.toUpperCase() || "N/A"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(assessment.results?.dimension_scores || {}).map(
                ([key, dim]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="uppercase">{key}</span>
                    <Badge variant="outline" className="text-xs">
                      {dim.percentage}%
                    </Badge>
                  </div>
                )
              )}
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center text-sm text-muted-foreground">
            Assessment results available
          </div>
        )
    }
  }

  // Determine if sync is available
  const canSync = hasEnoughMessages && lastSyncStatus?.can_sync && !isSyncing

  const renderAssessmentResults = (assessment: PersonalityAssessment) => {
    switch (assessment.assessment_id) {
      case "big-five":
        return (
          <BigFiveResults
            results={assessment.results}
            answers={assessment.answers}
            onBack={() => setSelectedAssessment(null)}
          />
        )
      case "mbti":
        return (
          <MBTIResults
            results={assessment.results}
            answers={assessment.answers}
            onBack={() => setSelectedAssessment(null)}
          />
        )
      case "disc":
        return (
          <DISCResults
            results={assessment.results}
            answers={assessment.answers}
            onBack={() => setSelectedAssessment(null)}
          />
        )
      default:
        return (
          <div className="p-4">
            <Button
              variant="outline"
              onClick={() => setSelectedAssessment(null)}
              className="mb-4"
            >
              ← Back to Assessments
            </Button>
            <p>Assessment type not supported for display</p>
          </div>
        )
    }
  }

  // If viewing a specific assessment, show its results
  if (selectedAssessment) {
    return (
      <Modal id="personalityAssessments" title={selectedAssessment.name}>
        {renderAssessmentResults(selectedAssessment)}
      </Modal>
    )
  }

  return (
    <Modal id="personalityAssessments" title="Personality Assessments">
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {(loading || memoryCountLoading || loadingLastSync) && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Loading personality assessments...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && !memoryCountLoading && !loadingLastSync && error && (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Failed to load assessments
                </h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={handleRefresh}
                  className="bg-primary hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Assessment in Progress */}
          {isSyncing && (
            <div className="mb-6">
              <Card className="border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
                      <Brain className="absolute inset-0 m-auto h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground mb-1">
                        Syncing Your AI Personality
                      </h3>
                      <p className="text-purple-600 dark:text-purple-400 font-medium">
                        {syncStatus || "Analyzing your conversations..."}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        This typically takes 3-5 minutes. Feel free to close the
                        app and check back later - the sync runs in the
                        background!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Assessments - First Time */}
          {!loading &&
            !memoryCountLoading &&
            !loadingLastSync &&
            !error &&
            assessments.length === 0 &&
            !isSyncing && (
              <div className="text-center max-w-lg mx-auto">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Brain className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Sync Your AI Personality
                  </h3>
                  <p className="text-muted-foreground mb-8">
                    Get AI-powered personality insights based on your
                    conversations with Ditto
                  </p>
                </div>

                {/* Requirements Card */}
                <Card className="border-border shadow-lg mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                        <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-foreground">
                        Sync Requirements
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-foreground">Memories needed</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              hasEnoughMessages ? "default" : "secondary"
                            }
                            className={
                              hasEnoughMessages
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                : ""
                            }
                          >
                            {messageCount} / 30
                          </Badge>
                          {hasEnoughMessages && (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-foreground">Rate limit</span>
                        <Badge variant="outline" className="border-border">
                          <Clock className="h-3 w-3 mr-1" />
                          Once per day
                        </Badge>
                      </div>

                      {lastSyncStatus?.last_sync_time && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-foreground">Last sync</span>
                          <span className="text-sm text-muted-foreground">
                            {formatLastSyncTime(lastSyncStatus.last_sync_time)}
                          </span>
                        </div>
                      )}
                    </div>

                    {!hasEnoughMessages && (
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium text-amber-800 dark:text-amber-200">
                            Need {30 - messageCount} more memories
                          </span>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Keep chatting with Ditto to unlock personality
                          insights!
                        </p>
                      </div>
                    )}

                    {lastSyncStatus && !lastSyncStatus.can_sync && (
                      <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Timer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          <span className="font-medium text-orange-800 dark:text-orange-200">
                            Next sync available in{" "}
                            {lastSyncStatus.hours_until_next_sync.toFixed(1)}{" "}
                            hours
                          </span>
                        </div>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          You can sync your personality once per day. Come back
                          later!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sync Button */}
                <Button
                  onClick={handleStartAssessment}
                  disabled={!canSync}
                  size="lg"
                  className={cn(
                    "w-full h-14 text-lg font-semibold shadow-lg transition-all duration-200",
                    canSync
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-purple-500/25"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Sync AI Personality
                </Button>
              </div>
            )}

          {/* Existing Assessments */}
          {!loading &&
            !memoryCountLoading &&
            !loadingLastSync &&
            !error &&
            assessments.length > 0 && (
              <div className="space-y-6">
                {/* Sync Button for existing users */}
                {hasEnoughMessages && (
                  <Card className="border-2 border-dashed border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                            <Sparkles className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-foreground">
                              Sync AI Personality
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                Update your insights with fresh analysis
                              </span>
                              {lastSyncStatus?.last_sync_time && (
                                <span className="text-xs">
                                  Last sync:{" "}
                                  {formatLastSyncTime(
                                    lastSyncStatus.last_sync_time
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {lastSyncStatus && !lastSyncStatus.can_sync && (
                            <Badge
                              variant="outline"
                              className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700"
                            >
                              <Timer className="h-3 w-3 mr-1" />
                              {lastSyncStatus.hours_until_next_sync.toFixed(1)}h
                              remaining
                            </Badge>
                          )}
                          <Button
                            onClick={handleStartAssessment}
                            disabled={!canSync}
                            className={cn(
                              "shadow-lg transition-all duration-200",
                              canSync
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                          >
                            {isSyncing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                Sync Now
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Assessment Cards */}
                <div className="grid gap-6">
                  {assessments
                    .sort((a, b) => {
                      const order = ["big-five", "mbti", "disc"]
                      return (
                        order.indexOf(a.assessment_id) -
                        order.indexOf(b.assessment_id)
                      )
                    })
                    .map((assessment: PersonalityAssessment) => (
                      <Card
                        key={`${assessment.assessment_id}-${assessment.session_id}`}
                        className="group cursor-pointer hover:shadow-xl transition-all duration-200 border-0 shadow-lg hover:scale-[1.02] bg-card"
                        onClick={() => setSelectedAssessment(assessment)}
                      >
                        <div
                          className={cn(
                            "h-2 rounded-t-lg bg-gradient-to-r",
                            getAssessmentGradient(assessment.assessment_id)
                          )}
                        />
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "p-3 rounded-xl bg-gradient-to-r text-white shadow-lg",
                                  getAssessmentGradient(
                                    assessment.assessment_id
                                  )
                                )}
                              >
                                {getAssessmentIcon(assessment.assessment_id)}
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold text-foreground">
                                  {assessment.name}
                                </CardTitle>
                                <p className="text-muted-foreground mt-1 text-sm">
                                  {getShortDescription(
                                    assessment.assessment_id
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-medium",
                                  getAssessmentBadgeColor(
                                    assessment.assessment_id
                                  )
                                )}
                              >
                                {assessment.assessment_id.toUpperCase()}
                              </Badge>
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                          {/* Key Results Preview */}
                          <div className="bg-muted/30 rounded-lg p-4">
                            {renderInlineResults(assessment)}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="font-medium">
                                  {assessment.questions_answered} questions
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>
                                  {formatDate(assessment.completed_at)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            >
                              View Full Results
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </Modal>
  )
}
