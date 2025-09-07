import React, { createContext, useContext, ReactNode } from "react"
import { useMemorySync } from "@/hooks/useMemorySync"
import { useComposeContext } from "@/contexts/ComposeContext"

interface SyncState {
  stage: number
}

interface MemorySyncContextType {
  syncsInProgress: Map<string, SyncState>
  triggerSync: (messageId: string) => Promise<void>
  checkStatuses: (messageIDs: string[]) => Promise<void>
  isStreaming: boolean
}

const MemorySyncContext = createContext<MemorySyncContextType | undefined>(
  undefined
)

export const useMemorySyncContext = () => {
  const context = useContext(MemorySyncContext)
  if (context === undefined) {
    throw new Error(
      "useMemorySyncContext must be used within a MemorySyncProvider"
    )
  }
  return context
}

interface MemorySyncProviderProps {
  children: ReactNode
}

export const MemorySyncProvider: React.FC<MemorySyncProviderProps> = ({
  children,
}) => {
  const { isWaitingForResponse } = useComposeContext()
  const syncState = useMemorySync(isWaitingForResponse)
  const value = {
    ...syncState,
    isSyncing: syncState.syncsInProgress.size > 0,
    isStreaming: isWaitingForResponse,
  }

  return (
    <MemorySyncContext.Provider value={value}>
      {children}
    </MemorySyncContext.Provider>
  )
}
