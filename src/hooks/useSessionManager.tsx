import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from "react"
import { useAuth } from "./useAuth"
import { getSessionV3, type ChatSessionV3 } from "@/api/chatV3"
import { useQuery } from "@tanstack/react-query"

interface SessionContextType {
  currentSessionId: string | null
  currentSession: ChatSessionV3 | null
  recentSessions: ChatSessionV3[]
  isLoadingSessions: boolean
  startNewSession: () => void
  resumeSession: (sessionId: string) => void
  resumeLatestSession: () => void
  setCurrentSessionId: (sessionId: string) => void
  hasRecentSessions: boolean
  hasUserMadeChoice: boolean
}

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Fetch latest session for the user
  const {
    data: latestSession,
    isLoading: isLoadingSessions,
    error: latestSessionError,
  } = useQuery({
    queryKey: ["session", user?.uid, "latest"],
    queryFn: () => {
      if (!user?.uid) throw new Error("No user ID")
      return getSessionV3(user.uid, "latest")
    },
    enabled: !!user?.uid,
    retry: false, // Don't retry if no sessions exist
  })

  // Fetch current session details if we have a session selected
  const { data: currentSession } = useQuery({
    queryKey: ["session", user?.uid, currentSessionId],
    queryFn: () => {
      if (!user?.uid || !currentSessionId)
        throw new Error("No user ID or session ID")
      return getSessionV3(user.uid, currentSessionId)
    },
    enabled: !!user?.uid && !!currentSessionId,
  })

  const recentSessions = useMemo(
    () => (latestSession ? [latestSession] : []),
    [latestSession]
  )
  const hasRecentSessions = !!latestSession && !latestSessionError

  const startNewSession = useCallback(() => {
    setCurrentSessionId('new')
  }, [])

  const resumeSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
  }, [])

  const resumeLatestSession = useCallback(() => {
    if (recentSessions.length > 0) {
      setCurrentSessionId(recentSessions[0].id)
    }
  }, [recentSessions])

  const value: SessionContextType = {
    currentSessionId,
    currentSession: currentSession || null,
    recentSessions,
    isLoadingSessions,
    startNewSession,
    resumeSession,
    resumeLatestSession,
    setCurrentSessionId,
    hasRecentSessions,
  }

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSessionManager() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSessionManager must be used within a SessionProvider")
  }
  return context
}
