import React from "react"
import { useSessionManager } from "@/hooks/useSessionManager"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { toast } from "sonner"
import {
  MessageSquarePlus,
  Clock,
  MessageCircle,
  Calendar,
  Hash,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SessionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SessionDetailsModal({
  isOpen,
  onClose,
}: SessionDetailsModalProps) {
  const {
    currentSessionId,
    currentSession,
    recentSessions,
    startNewSession,
    resumeSession,
  } = useSessionManager()
  const { refetch } = useConversationHistory()

  const handleStartNewSession = () => {
    startNewSession()
    refetch() // Refresh conversation history
    toast.success("Started new session")
    onClose()
  }

  const handleResumeSession = (sessionId: string) => {
    resumeSession(sessionId)
    refetch() // Refresh conversation history
    toast.success("Resumed session")
    onClose()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Session Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current session info */}
          {currentSession && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-600">
                  Current Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{currentSession.title}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Started {formatDate(currentSession.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">
                    {currentSession.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleStartNewSession}
              className="w-full justify-start"
              variant="default"
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Start New Session
            </Button>

            {!currentSessionId && recentSessions.length > 0 && (
              <Button
                onClick={() => handleResumeSession(recentSessions[0].id)}
                className="w-full justify-start"
                variant="outline"
              >
                <Clock className="mr-2 h-4 w-4" />
                Resume Latest Session
              </Button>
            )}
          </div>

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recent Sessions
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {recentSessions.slice(0, 5).map((session) => (
                  <Button
                    key={session.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-xs h-auto py-2",
                      session.id === currentSessionId && "bg-accent"
                    )}
                    onClick={() => handleResumeSession(session.id)}
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {session.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {session.status}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
