import { ReactNode, createContext, useContext, useState } from "react"
import { useModal } from "./useModal"
import { getMemories, Memory } from "@/api/getMemories"
import { useModelPreferences } from "./useModelPreferences"
import { auth } from "@/control/firebase"
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
  memories: Memory[] // These are the children/related memories for the currentRootMemory
  setMemories: (memories: Memory[]) => void
  currentRootMemory: Memory | null // The memory that is the center of the current network view
  setCurrentRootMemory: (memory: Memory | null) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  fetchMemories: (memory: Memory) => Promise<void>
  deleteMemory: (memoryId: string) => void
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
  const { preferences } = useModelPreferences()

  return (
    <MemoryNetworkContext.Provider
      value={{
        memories,
        setMemories,
        currentRootMemory,
        setCurrentRootMemory,
        loading,
        setLoading,
        deleteMemory: (memoryId: string) => {
          setMemories((prevMemories) =>
            filterMemoryById(prevMemories, memoryId)
          )
          // If the deleted memory was the root, clear it too
          if (currentRootMemory?.id === memoryId) {
            setCurrentRootMemory(null)
            setMemories([]) // Clear children too
          }
        },
        fetchMemories: async (memory) => {
          try {
            setLoading(true)
            setCurrentRootMemory(memory) // Set the root memory when fetching

            const userID = auth.currentUser?.uid
            if (!userID) {
              throw new Error("User not authenticated")
            }
            if (!preferences) {
              throw new Error("Model preferences not available")
            }
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

            if (memoriesResponse.err) {
              throw new Error(memoriesResponse.err)
            }

            if (!memoriesResponse.ok || !memoriesResponse.ok.longTerm) {
              // It's possible to have a root memory with no children fetched
              setMemories([]) // Set to empty array if no children
              // throw new Error("Failed to fetch memories or no children found") - Don't throw error
            } else {
              const fetchedMemories = memoriesResponse.ok.longTerm
              console.log("Fetched child memories:", fetchedMemories)
              setMemories(Array.isArray(fetchedMemories) ? fetchedMemories : [])
            }
          } catch (error: any) {
            console.error("Error fetching memories:", error)
            toast.error(`Failed to load memory network: ${error.message}`)
            setMemories([]) // Clear memories on error
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
      context.setCurrentRootMemory(message) // Set root memory before fetching
      await context.fetchMemories(message) // fetchMemories will also set currentRootMemory
      openModal()
    } catch (error: any) {
      console.error("Error showing memory network:", error)
      toast.error(`Failed to show memory network: ${error.message}`)
    }
  }

  return {
    ...context,
    showMemoryNetwork,
    closeMemoryNetwork: closeModal,
  }
}
