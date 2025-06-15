import React, { createContext, useContext, ReactNode } from "react"
import { useMemorySync } from "@/hooks/useMemorySync"

interface MemorySyncContextType {
  isSyncing: boolean
  currentStage: number
  lastSyncTime: Date | null
  triggerSync: () => Promise<void>
  completeSyncIndicator: () => void
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

  return (
    <MemorySyncContext.Provider value={syncState}>
      {children}
    </MemorySyncContext.Provider>
  )
}
