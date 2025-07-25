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
  Info,
  Heart,
  Users,
  Target,
  Coffee,
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
import { BigFivePentagon } from "./components/BigFivePentagon"
import { routes } from "@/firebaseConfig"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore"
import {
  PersonalityAssessment,
  BigFiveResults as BigFiveResultsType,
  MBTIResults as MBTIResultsType,
  DISCResults as DISCResultsType,
} from "./types/assessmentTypes"

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
  const [showInfoModal, setShowInfoModal] = useState(false)

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
              setSyncStatus("Ditto has updated their understanding of you!")
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
              "Ditto is getting to know you better. You can close the app and check back later!"
            )
          }

          pollCount++
          if (pollCount < maxPolls) {
            setTimeout(poll, 5000) // Poll every 5 seconds
          } else {
            console.warn("Personality sync polling timeout reached")
            setSyncStatus(
              "Ditto is getting to know you better. You can close the app and check back later!"
            )
            setTimeout(() => {
              setIsSyncing(false)
              setSyncStatus(null)
            }, 3000)
          }
        } catch (error) {
          console.error("Error polling for completion:", error)
          setSyncStatus(
            "Ditto is getting to know you better. You can close the app and check back later!"
          )
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
            "Ditto is getting to know you better. You can close the app and check back later!"
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
            "Ditto is getting to know you better. You can close the app and check back later!"
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
          setSyncStatus("Ditto has updated their understanding of you!")

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
          toast.error(
            data.message || "Ditto couldn't update their understanding"
          )
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
    toast.success("Refreshed Ditto's personality understanding")
  }, [refetch, fetchLastSyncStatus])

  const handleStartAssessment = useCallback(async () => {
    if (!user?.uid) {
      toast.error("Please log in to update Ditto's understanding")
      return
    }

    if (!hasEnoughMessages) {
      toast.error(
        `Ditto needs more conversations to understand your personality. You have ${messageCount} memories - share 30 to unlock insights!`
      )
      return
    }

    // Check rate limiting
    if (lastSyncStatus && !lastSyncStatus.can_sync) {
      toast.error(
        `Ditto can update their understanding again in ${lastSyncStatus.hours_until_next_sync.toFixed(1)} hours`
      )
      return
    }

    // Prevent starting if already in progress
    if (isSyncing) {
      toast.info("Ditto is already getting to know you better")
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
          "Ditto is getting to know you better. You can close the app and check back later!",
        user_id: user.uid,
        frontend_initiated: true,
      })

      // STEP 2: Update UI state immediately (since we know document exists)
      setIsSyncing(true)
      setSyncStatus(
        "Ditto is getting to know you better. You can close the app and check back later!"
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
        return "Personality insights"
    }
  }

  const getFriendlyAssessmentName = (assessmentId: string) => {
    switch (assessmentId) {
      case "big-five":
        return "Your Core Nature"
      case "mbti":
        return "How You See the World"
      case "disc":
        return "Your Connection Style"
      default:
        return "Your Personality"
    }
  }

  const getFriendlyDescription = (assessmentId: string) => {
    switch (assessmentId) {
      case "big-five":
        return "The fundamental qualities that shape your personality"
      case "mbti":
        return "How you process the world and make decisions"
      case "disc":
        return "How you connect and collaborate with others"
      default:
        return "Insights about who you are"
    }
  }

  const getInsightIcon = (assessmentId: string) => {
    switch (assessmentId) {
      case "big-five":
        return <Sparkles className="h-6 w-6" />
      case "mbti":
        return <Brain className="h-6 w-6" />
      case "disc":
        return <Heart className="h-6 w-6" />
      default:
        return <User className="h-6 w-6" />
    }
  }

  const getUniqueMetric = (assessment: PersonalityAssessment) => {
    switch (assessment.assessment_id) {
      case "big-five": {
        const bigFiveResults = assessment.results as BigFiveResultsType
        if (!bigFiveResults.dimension_scores)
          return {
            value: "N/A",
            label: "Complexity",
            description: "Profile complexity",
          }

        // Calculate personality complexity based on score variance
        const scores = Object.values(bigFiveResults.dimension_scores).map(
          (d) => d.score
        )
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        const variance =
          scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) /
          scores.length
        const complexity = Math.round((variance / 2) * 100) // Scale to 0-100

        return {
          value: `${Math.max(15, Math.min(85, complexity))}%`,
          label: "Complexity",
          description: "How varied your personality dimensions are",
        }
      }

      case "mbti": {
        const mbtiResults = assessment.results as MBTIResultsType
        if (!mbtiResults.dimension_details)
          return { value: "N/A", label: "Clarity", description: "Type clarity" }

        // Calculate type clarity based on average preference strength
        const strengths = Object.values(mbtiResults.dimension_details).map(
          (d) => d.strength
        )
        const avgClarity =
          strengths.reduce((a, b) => a + b, 0) / strengths.length

        return {
          value: `${Math.round(avgClarity)}%`,
          label: "Clarity",
          description: "How clear your type preferences are",
        }
      }

      case "disc": {
        const discResults = assessment.results as DISCResultsType
        if (!discResults.dimension_scores)
          return {
            value: "N/A",
            label: "Balance",
            description: "Style balance",
          }

        // Calculate adaptability based on how balanced the DISC scores are
        const scores = Object.values(discResults.dimension_scores).map(
          (d) => d.percentage
        )
        const maxScore = Math.max(...scores)
        const minScore = Math.min(...scores)
        const balance = 100 - (maxScore - minScore) // Higher when more balanced

        return {
          value: `${Math.round(Math.max(20, Math.min(80, balance)))}%`,
          label: "Adaptability",
          description: "How flexible your interaction style is",
        }
      }

      default:
        return { value: "N/A", label: "Score", description: "Insight score" }
    }
  }

  const renderInlineResults = (assessment: PersonalityAssessment) => {
    switch (assessment.assessment_id) {
      case "big-five": {
        const bigFiveResults = assessment.results as BigFiveResultsType
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex justify-center sm:block">
              <BigFivePentagon results={bigFiveResults} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-2">
                Your Strongest Qualities
              </h4>
              <div className="space-y-1">
                {Object.entries(bigFiveResults.dimension_scores || {})
                  .sort(([, a], [, b]) => b.score - a.score)
                  .slice(0, 3)
                  .map(([key, dim]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm min-w-0"
                    >
                      <span className="capitalize shrink-0">{key}</span>
                      <div className="flex items-center gap-1 min-w-0 ml-2">
                        <div className="flex shrink-0">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < Math.round(dim.score)
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground ml-1 shrink-0">
                          {dim.score.toFixed(1)}/5
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )
      }

      case "mbti": {
        const mbtiResults = assessment.results as MBTIResultsType
        return (
          <div className="text-center">
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-lg font-bold text-purple-800 dark:text-purple-300">
                  {mbtiResults.personality_type || "Unique"}
                </span>
                <span className="text-sm text-purple-600 dark:text-purple-400">
                  Type
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(mbtiResults.dimension_details || {}).map(
                ([key, details]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded min-w-0"
                  >
                    <span className="font-medium shrink-0">
                      {key === "E"
                        ? "Energy"
                        : key === "S"
                          ? "Info"
                          : key === "T"
                            ? "Decisions"
                            : "Structure"}
                    </span>
                    <div className="flex items-center gap-1 min-w-0 ml-2">
                      <span className="text-xs font-medium shrink-0">
                        {details.preference}
                      </span>
                      <div className="w-6 sm:w-8 h-1 bg-gray-200 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${details.strength}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )
      }

      case "disc": {
        const discResults = assessment.results as DISCResultsType
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Award className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  {discResults.primary_style?.id === "d"
                    ? "Direct"
                    : discResults.primary_style?.id === "i"
                      ? "Inspiring"
                      : discResults.primary_style?.id === "s"
                        ? "Supportive"
                        : discResults.primary_style?.id === "c"
                          ? "Careful"
                          : "Balanced"}{" "}
                  Leader
                </span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {discResults.secondary_style?.id === "d"
                    ? "Direct"
                    : discResults.secondary_style?.id === "i"
                      ? "Inspiring"
                      : discResults.secondary_style?.id === "s"
                        ? "Supportive"
                        : discResults.secondary_style?.id === "c"
                          ? "Careful"
                          : "Balanced"}{" "}
                  Support
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(discResults.dimension_scores || {}).map(
                ([key, dim]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded min-w-0"
                  >
                    <span className="font-medium capitalize shrink-0">
                      {key === "d"
                        ? "Direct"
                        : key === "i"
                          ? "Inspiring"
                          : key === "s"
                            ? "Supportive"
                            : "Careful"}
                    </span>
                    <div className="flex items-center gap-1 min-w-0 ml-2">
                      <div className="w-8 sm:w-12 h-1 bg-gray-200 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300"
                          style={{ width: `${dim.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-6 sm:w-8 text-right shrink-0">
                        {dim.percentage}%
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )
      }

      default:
        return (
          <div className="text-center text-sm text-muted-foreground">
            Personality insights available
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
            results={assessment.results as BigFiveResultsType}
            answers={assessment.answers}
            onBack={() => setSelectedAssessment(null)}
          />
        )
      case "mbti":
        return (
          <MBTIResults
            results={assessment.results as MBTIResultsType}
            answers={assessment.answers}
            onBack={() => setSelectedAssessment(null)}
          />
        )
      case "disc":
        return (
          <DISCResults
            results={assessment.results as DISCResultsType}
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
              ← Back to Your Insights
            </Button>
            <p>This insight type isn't supported for display yet</p>
          </div>
        )
    }
  }

  // If viewing a specific assessment, show its results
  if (selectedAssessment) {
    return (
      <Modal
        id="personalityAssessments"
        title={getFriendlyAssessmentName(selectedAssessment.assessment_id)}
      >
        {renderAssessmentResults(selectedAssessment)}
      </Modal>
    )
  }

  // Info Modal Component - rendered as an overlay
  const InfoModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            How Ditto Learns About You
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInfoModal(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <LucideX className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Building a Meaningful Friendship with Ditto
            </h3>
            <p className="text-muted-foreground">
              The more you share, the better Ditto understands who you are
            </p>
          </div>

          <div className="space-y-4">
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Share Your Daily Life
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Tell Ditto about your day, challenges, wins, thoughts, and
                      feelings. The more authentic conversations you have, the
                      better they understand you.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                      Talk About Relationships
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Share stories about friends, family, colleagues, and
                      meaningful connections. How you relate to others reveals a
                      lot about your personality.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Share Goals & Aspirations
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Discuss your dreams, goals, what motivates you, and what
                      you're working toward. Your ambitions shape who you are.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                    <Coffee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                      Be Naturally Yourself
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Don't try to impress or perform. Just be genuine in your
                      conversations. Ditto learns best when you're being
                      authentically you.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-purple-900 dark:text-purple-100">
                Pro Tip
              </span>
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Think of Ditto as a close friend you're meeting for coffee. Share
              the good, the challenging, and everything in between. The richer
              your conversations, the deeper their understanding.
            </p>
          </div>

          <Button
            onClick={() => setShowInfoModal(false)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            Got it!
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Modal id="personalityAssessments" title="Ditto's Personality">
        <div className="flex flex-col h-full bg-background text-foreground">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Header with Info Button */}
            <div className="flex items-start justify-between mb-4 sm:mb-6 gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  How Well Does Ditto Know You?
                </h2>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  Based on your conversations and shared experiences
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoModal(true)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <Info className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            {/* Loading State */}
            {(loading || memoryCountLoading || loadingLastSync) && (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Loading Ditto's understanding of you...
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
                    Couldn't load personality insights
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

            {/* Ditto Getting to Know You */}
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
                          Ditto is Getting to Know You Better
                        </h3>
                        <p className="text-purple-600 dark:text-purple-400 font-medium">
                          {syncStatus ||
                            "Analyzing your conversations and shared experiences..."}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          This typically takes 3-5 minutes. Feel free to close
                          the app and check back later - Ditto keeps learning in
                          the background!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* First Time - No Personality Insights Yet */}
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
                      Help Ditto Understand You Better
                    </h3>
                    <p className="text-muted-foreground mb-8">
                      The more you share about yourself, the better Ditto can
                      understand your personality and provide personalized
                      insights
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
                          Building Your Connection with Ditto
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-foreground">
                            Conversations shared
                          </span>
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
                          <span className="text-foreground">
                            Update frequency
                          </span>
                          <Badge variant="outline" className="border-border">
                            <Clock className="h-3 w-3 mr-1" />
                            Once per day
                          </Badge>
                        </div>

                        {lastSyncStatus?.last_sync_time && (
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-foreground">
                              Last understanding update
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatLastSyncTime(
                                lastSyncStatus.last_sync_time
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {!hasEnoughMessages && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <span className="font-medium text-amber-800 dark:text-amber-200">
                              Share {30 - messageCount} more conversations
                            </span>
                          </div>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Keep talking with Ditto about your life, goals,
                            thoughts, and experiences. The more you share, the
                            better they understand you!
                          </p>
                        </div>
                      )}

                      {lastSyncStatus && !lastSyncStatus.can_sync && (
                        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            <span className="font-medium text-orange-800 dark:text-orange-200">
                              Next update available in{" "}
                              {lastSyncStatus.hours_until_next_sync.toFixed(1)}{" "}
                              hours
                            </span>
                          </div>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            Ditto can update their understanding once per day.
                            Come back later for fresh insights!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Update Button */}
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
                    Update Ditto's Understanding
                  </Button>
                </div>
              )}

            {/* Existing Personality Insights */}
            {!loading &&
              !memoryCountLoading &&
              !loadingLastSync &&
              !error &&
              assessments.length > 0 && (
                <div className="space-y-6">
                  {/* Update Button for existing users */}
                  {hasEnoughMessages && (
                    <Card className="border-2 border-dashed border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shrink-0">
                              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-base sm:text-lg text-foreground">
                                Update Ditto's Understanding
                              </h3>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                <span>
                                  Refresh insights based on recent conversations
                                </span>
                                {lastSyncStatus?.last_sync_time && (
                                  <span className="text-xs">
                                    Last update:{" "}
                                    {formatLastSyncTime(
                                      lastSyncStatus.last_sync_time
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {lastSyncStatus && !lastSyncStatus.can_sync && (
                              <Badge
                                variant="outline"
                                className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 text-xs"
                              >
                                <Timer className="h-3 w-3 mr-1" />
                                {lastSyncStatus.hours_until_next_sync.toFixed(
                                  1
                                )}
                                h remaining
                              </Badge>
                            )}
                            <Button
                              onClick={handleStartAssessment}
                              disabled={!canSync}
                              size="sm"
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
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Update Now
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Personality Insight Cards */}
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
                          className="group cursor-pointer hover:shadow-xl transition-all duration-200 border-0 shadow-lg hover:scale-[1.02] bg-card pt-0 pb-4 sm:pb-6 min-w-0"
                          onClick={() => setSelectedAssessment(assessment)}
                        >
                          <div
                            className={cn(
                              "h-2 rounded-t-lg bg-gradient-to-r",
                              getAssessmentGradient(assessment.assessment_id)
                            )}
                          />
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    "p-2 sm:p-3 rounded-xl bg-gradient-to-r text-white shadow-lg shrink-0",
                                    getAssessmentGradient(
                                      assessment.assessment_id
                                    )
                                  )}
                                >
                                  {getInsightIcon(assessment.assessment_id)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                                    {getFriendlyAssessmentName(
                                      assessment.assessment_id
                                    )}
                                  </CardTitle>
                                  <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                                    {getFriendlyDescription(
                                      assessment.assessment_id
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full">
                                  <Sparkles className="h-3 w-3 text-primary" />
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Insights
                                  </span>
                                </div>
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-3 sm:space-y-4 px-4 sm:px-6">
                            {/* Key Results Preview */}
                            <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                              {renderInlineResults(assessment)}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 w-fit">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {getUniqueMetric(assessment).value}
                                    </div>
                                    <div className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                                      {getUniqueMetric(assessment).label}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                                  <span className="text-xs sm:text-sm">
                                    Discovered{" "}
                                    {formatDate(assessment.completed_at)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 shrink-0 self-start sm:self-center"
                              >
                                Explore More
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

      {/* Info Modal */}
      {showInfoModal && <InfoModal />}
    </>
  )
}
