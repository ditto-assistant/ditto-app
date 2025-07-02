import React, { createContext, useContext, ReactNode } from "react"
import { useMemorySync } from "@/hooks/useMemorySync"

interface SyncState {
  stage: number
}

interface MemorySyncContextType {
  syncsInProgress: Map<string, SyncState>
  triggerSync: (messageId: string) => Promise<void>
  checkStatuses: (messageIDs: string[]) => Promise<void>
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
  const syncState = useMemorySync()
  const value = {
    ...syncState,
    isSyncing: syncState.syncsInProgress.size > 0,
  }

  return (
    <MemorySyncContext.Provider value={value}>
      {children}
    </MemorySyncContext.Provider>
  )
}
