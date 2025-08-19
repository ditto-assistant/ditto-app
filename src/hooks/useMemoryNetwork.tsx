import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react"
import { useModal } from "./useModal"
import { getMemories, Memory } from "@/api/getMemories"
import { getComprehensivePairDetails, ComprehensivePairDetails } from "@/api/kg"
import { useModelPreferences } from "./useModelPreferences"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"

// Recursively filter out a memory by ID from a memories array
const filterMemoryById = (memories: Memory[], idToRemove: string): Memory[] => {
  return memories
    .filter((memory) => memory.id !== idToRemove)
    .map((memory) => {
      if (memory.children && memory.children.length > 0) {
        return {
          ...memory,
          children: filterMemoryById(memory.children, idToRemove),
        }
      }
      return memory
    })
}

interface MemoryNetworkContextType {
  memories: Memory[]
  setMemories: (memories: Memory[]) => void
  currentRootMemory: Memory | null
  setCurrentRootMemory: (memory: Memory | null) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  fetchMemories: (memory: Memory) => Promise<void>
  deleteMemory: (memoryId: string) => void
  pairDetails: Record<string, ComprehensivePairDetails>
}

const MemoryNetworkContext = createContext<
  MemoryNetworkContextType | undefined
>(undefined)

export function MemoryNetworkProvider({ children }: { children: ReactNode }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)
  const [currentRootMemory, setCurrentRootMemory] = useState<Memory | null>(
    null
  )
  const [pairDetails, setPairDetails] = useState<
    Record<string, ComprehensivePairDetails>
  >({})
  const { preferences } = useModelPreferences()

  function collectPairIds(root: Memory, children: Memory[]): string[] {
    const ids = new Set<string>()
    ids.add(root.id)
    const dfs = (m: Memory) => {
      ids.add(m.id)
      if (m.children) m.children.forEach(dfs)
    }
    children.forEach(dfs)
    return Array.from(ids)
  }

  return (
    <MemoryNetworkContext.Provider
      value={{
        memories,
        setMemories,
        currentRootMemory,
        setCurrentRootMemory,
        loading,
        setLoading,
        pairDetails,
        deleteMemory: (memoryId: string) => {
          setMemories((prevMemories) =>
            filterMemoryById(prevMemories, memoryId)
          )
          if (currentRootMemory?.id === memoryId) {
            setCurrentRootMemory(null)
            setMemories([])
            setPairDetails({})
          }
        },
        fetchMemories: async (memory) => {
          try {
            setLoading(true)
            setCurrentRootMemory(memory)

            const userID = auth.currentUser?.uid
            if (!userID) throw new Error("User not authenticated")
            if (!preferences) throw new Error("Model preferences not available")

            const memoriesResponse = await getMemories(
              {
                userID,
                longTerm: {
                  pairID: memory.id,
                  nodeCounts: preferences.memory.longTermMemoryChain,
                },
                stripImages: false,
              },
              "application/json"
            )
            if (memoriesResponse.err) throw new Error(memoriesResponse.err)

            const fetched = Array.isArray(memoriesResponse.ok?.longTerm)
              ? (memoriesResponse.ok?.longTerm as Memory[])
              : []
            setMemories(fetched)

            const allPairIds = collectPairIds(memory, fetched)
            if (allPairIds.length > 0) {
              const detailsResp = await getComprehensivePairDetails({
                pairIDs: allPairIds,
              })
              if (detailsResp.err) throw new Error(detailsResp.err)
              setPairDetails(detailsResp.ok || {})
            } else {
              setPairDetails({})
            }
          } catch (error: unknown) {
            console.error("Error fetching memories:", error)
            toast.error(
              `Failed to load memory network: ${error instanceof Error ? error.message : "Unknown error"}`
            )
            setMemories([])
            setPairDetails({})
          } finally {
            setLoading(false)
          }
        },
      }}
    >
      {children}
    </MemoryNetworkContext.Provider>
  )
}

export function useMemoryNetwork() {
  const context = useContext(MemoryNetworkContext)
  if (context === undefined) {
    throw new Error(
      "useMemoryNetwork must be used within a MemoryNetworkProvider"
    )
  }
  const { createOpenHandler, createCloseHandler } = useModal()
  const openModal = createOpenHandler("memoryNetwork")
  const closeModal = createCloseHandler("memoryNetwork")

  const showMemoryNetwork = async (message: Memory) => {
    try {
      context.setCurrentRootMemory(message)
      await context.fetchMemories(message)
      openModal()
    } catch (error: unknown) {
      console.error("Error showing memory network:", error)
      toast.error(
        `Failed to show memory network: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  return {
    ...context,
    showMemoryNetwork,
    closeMemoryNetwork: closeModal,
  }
}
