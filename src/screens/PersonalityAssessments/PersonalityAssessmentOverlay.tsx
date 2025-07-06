import { useCallback, useEffect, useState } from "react"
import { Brain, TrendingUp, User, Award, X as LucideX, RefreshCw, MessageSquare, Clock, Play } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePersonalityAssessments } from "./hooks/usePersonalityAssessments"
import { useMemoryCount } from "@/hooks/useMemoryCount"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import BigFiveResults from "./components/BigFiveResults"
import MBTIResults from "./components/MBTIResults"
import DISCResults from "./components/DISCResults"
import { routes } from "@/firebaseConfig"

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

export default function PersonalityAssessmentOverlay() {
  const { user } = useAuth()
  const { count: messageCount, loading: memoryCountLoading } = useMemoryCount()
  const { assessments, loading, error, refetch } = usePersonalityAssessments(user?.uid)
  const [selectedAssessment, setSelectedAssessment] = useState<PersonalityAssessment | null>(null)
  const [isStartingAssessment, setIsStartingAssessment] = useState(false)
  const [assessmentStatus, setAssessmentStatus] = useState<string | null>(null)

  // Use memory count from the dedicated hook
  const hasEnoughMessages = messageCount >= 30

  const handleRefresh = useCallback(() => {
    refetch()
    toast.success("Refreshed personality assessments")
  }, [refetch])

  const handleStartAssessment = useCallback(async () => {
    if (!user?.uid) {
      toast.error("Please log in to start personality assessment")
      return
    }

    if (!hasEnoughMessages) {
      toast.error(`You need at least 30 memories to compute your personality. You currently have ${messageCount}.`)
      return
    }

    setIsStartingAssessment(true)
    setAssessmentStatus("Starting personality assessment...")

    try {
      const messageId = `assessment_${user.uid}_${Date.now()}`
      
      // Get Firebase token
      const token = await user.getIdToken()
      
      // Start personality assessment
      const response = await fetch(routes.personalityAssessmentStart, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.uid,
          message_id: messageId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start assessment')
      }

      const data = await response.json()
      setAssessmentStatus("Assessment started successfully! Processing your personality...")
      
      // Poll for status updates
      let pollCount = 0
      const maxPolls = 60 // 5 minutes max
      
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(routes.personalityAssessmentStatus, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              message_ids: [messageId]
            })
          })

          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            const status = statusData[messageId]
            
            if (status) {
              setAssessmentStatus(status.status)
              
              if (status.stage === 5) { // Completed
                setAssessmentStatus("Assessment completed successfully!")
                refetch()
                setTimeout(() => {
                  setIsStartingAssessment(false)
                  setAssessmentStatus(null)
                }, 2000)
                return
              } else if (status.stage === -1) { // Failed
                throw new Error(status.status)
              }
            }
          }
          
          pollCount++
          if (pollCount < maxPolls) {
            setTimeout(pollStatus, 5000) // Poll every 5 seconds
          } else {
            throw new Error("Assessment timed out. Please try again.")
          }
        } catch (error) {
          console.error("Error polling assessment status:", error)
          setAssessmentStatus("Error checking assessment status")
          setIsStartingAssessment(false)
        }
      }

      // Start polling after a short delay
      setTimeout(pollStatus, 2000)

    } catch (error) {
      console.error("Error starting personality assessment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start assessment")
      setIsStartingAssessment(false)
      setAssessmentStatus(null)
    }
  }, [user, hasEnoughMessages, messageCount, refetch])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAssessmentIcon = (assessmentId: string) => {
    switch (assessmentId) {
      case 'big-five':
        return <TrendingUp className="h-5 w-5" />
      case 'mbti':
        return <User className="h-5 w-5" />
      case 'disc':
        return <Award className="h-5 w-5" />
      default:
        return <Brain className="h-5 w-5" />
    }
  }

  const getAssessmentColor = (assessmentId: string) => {
    switch (assessmentId) {
      case 'big-five':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'mbti':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'disc':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderAssessmentResults = (assessment: PersonalityAssessment) => {
    switch (assessment.assessment_id) {
      case 'big-five':
        return (
          <BigFiveResults 
            results={assessment.results} 
            answers={assessment.answers}
            onBack={() => setSelectedAssessment(null)}
          />
        )
      case 'mbti':
        return (
          <MBTIResults 
            results={assessment.results} 
            answers={assessment.answers}
            onBack={() => setSelectedAssessment(null)}
          />
        )
      case 'disc':
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
      <div className="flex flex-col h-full p-4 bg-background text-foreground">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-lg">Your AI Personality Insights</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(loading || memoryCountLoading) && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p>Loading personality assessments...</p>
              </div>
            </div>
          )}

          {!loading && !memoryCountLoading && error && (
            <div className="flex flex-col items-center justify-center h-64 text-destructive text-center gap-3 bg-destructive/10 rounded-lg p-6 m-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/20">
                <LucideX size={20} />
              </div>
              <p className="font-medium">Failed to load assessments</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-2">
                Try Again
              </Button>
            </div>
          )}

          {!loading && !memoryCountLoading && !error && assessments.length === 0 && !isStartingAssessment && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center gap-4">
              <Brain className="h-12 w-12 opacity-50" />
              <div>
                <p className="font-medium text-lg">No personality assessments found</p>
                <p className="text-sm">
                  Generate your AI personality insights based on your conversations with Ditto.
                </p>
              </div>
              
              {/* Message count requirement card */}
              <Card className="w-full max-w-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Requirements</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Memories needed:</span>
                      <Badge variant={hasEnoughMessages ? "default" : "secondary"}>
                        {messageCount} / 30
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Rate limit:</span>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Once per day
                      </Badge>
                    </div>
                  </div>
                  
                  {!hasEnoughMessages && (
                    <div className="mt-3 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
                      <strong>You need {30 - messageCount} more memories</strong> before you can generate personality insights. Keep chatting with Ditto!
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleStartAssessment}
                    disabled={!hasEnoughMessages}
                    className="w-full mt-4"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Generate Personality Assessment
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Assessment in progress */}
          {isStartingAssessment && (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-lg">Generating Personality Assessment</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {assessmentStatus || "Analyzing your conversations..."}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                This may take a few minutes as we analyze your conversations with AI.
              </div>
            </div>
          )}

          {!loading && !memoryCountLoading && !error && assessments.length > 0 && (
            <div className="space-y-4">
              {/* Generate new assessment button for existing users */}
              {hasEnoughMessages && !isStartingAssessment && (
                <Card className="border-dashed border-2 border-purple-300 bg-purple-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <Brain className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Generate New Assessment</p>
                          <p className="text-sm text-muted-foreground">
                            Update your personality insights (once per day)
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleStartAssessment}
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-100"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processing status */}
              {isStartingAssessment && (
                <Card className="border-purple-300 bg-purple-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
                      <div>
                        <p className="font-medium">Generating Assessment...</p>
                        <p className="text-sm text-muted-foreground">
                          {assessmentStatus || "Analyzing your conversations..."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {assessments.map((assessment: PersonalityAssessment) => (
                  <Card 
                    key={`${assessment.assessment_id}-${assessment.session_id}`} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
                    onClick={() => setSelectedAssessment(assessment)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100">
                            {getAssessmentIcon(assessment.assessment_id)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{assessment.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {assessment.description}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={getAssessmentColor(assessment.assessment_id)}
                        >
                          {assessment.assessment_id.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>
                            📊 {assessment.questions_answered} questions answered
                          </span>
                          <span>
                            ✅ Completed {formatDate(assessment.completed_at)}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Results →
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