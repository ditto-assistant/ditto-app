import React, { useState, useEffect, useRef, useCallback } from "react"
import { List, Network, Info, X as LucideX } from "lucide-react"
import { getMemories, Memory } from "@/api/getMemories"
import { embed } from "@/api/embed"
import { useAuth } from "@/hooks/useAuth"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { getConversationCount } from "@/api/userContent"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import MemoriesNetworkGraph from "@/screens/MemoriesDashboard/MemoriesNetworkGraph"
import MemoriesListView from "@/screens/MemoriesDashboard/MemoriesListView"
import SearchBar from "@/screens/MemoriesDashboard/SearchBar"

// Utility function to format numbers with abbreviations
const formatCount = (count: number) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M"
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  } else {
    return count.toString()
  }
}

// Helper function to flatten memories for the list view
const flattenMemoriesForList = (
  memoryList: Memory[]
): (Memory & { level: number })[] => {
  let flatList: (Memory & { level: number })[] = []
  const dive = (mems: Memory[], level: number) => {
    // First sort the memories at this level by vector_distance (lower is better, so reverse to get best first)
    const sortedMems = [...mems].sort(
      (a, b) => b.vector_distance - a.vector_distance
    )

    for (const mem of sortedMems) {
      flatList.push({ ...mem, children: undefined, level })
      if (mem.children && mem.children.length > 0) {
        dive(mem.children, level + 1)
      }
    }
  }
  dive(memoryList, 1)
  return flatList
}

export default function MemoriesDashboardOverlay() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<"list" | "network">("list")
  const { user } = useAuth()
  const { preferences } = useModelPreferences()
  const [error, setError] = useState<string | null>(null)
  const [lastSearchedTerm, setLastSearchedTerm] = useState("")
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { showMemoryNetwork } = useMemoryNetwork()
  const [memoryCount, setMemoryCount] = useState<number>(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchMemoryCount = async () => {
      if (user?.uid) {
        try {
          const result = await getConversationCount(user.uid)
          if (result instanceof Error) {
            throw result
          }
          setMemoryCount(result.count)
        } catch (error) {
          console.error("Error fetching memory count:", error)
        }
      }
    }
    fetchMemoryCount()
    const handleMemoryUpdate = () => fetchMemoryCount()
    window.addEventListener("memoryUpdated", handleMemoryUpdate)
    return () => window.removeEventListener("memoryUpdated", handleMemoryUpdate)
  }, [user?.uid])

  const handleSearch = async () => {
    const searchTerm = searchInputRef.current?.value ?? ""
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term")
      return
    }
    setLoading(true)
    setError(null)
    setMemories([])
    setLastSearchedTerm(searchTerm)
    try {
      const userID = user?.uid
      if (!userID) throw new Error("User not authenticated")
      if (!preferences) throw new Error("Model preferences not available")
      const embeddingResult = await embed({
        userID,
        text: searchTerm,
        model: "text-embedding-005",
      })
      if (embeddingResult.err)
        throw new Error(`Embedding failed: ${embeddingResult.err}`)
      if (!embeddingResult.ok) throw new Error("Embedding failed: No result")
      const memoriesResponse = await getMemories(
        {
          userID,
          longTerm: {
            vector: embeddingResult.ok,
            nodeCounts: preferences.memory.longTermMemoryChain,
          },
          stripImages: false,
        },
        "application/json"
      )
      if (memoriesResponse.err) throw new Error(memoriesResponse.err)
      if (!memoriesResponse.ok || !memoriesResponse.ok.longTerm) {
        setMemories([])
        throw new Error("No memories found or query failed.")
      }
      const resultsTree = memoriesResponse.ok.longTerm
      setMemories(resultsTree)
      if (resultsTree.length === 0)
        setError("No memories found matching your search term.")
    } catch (err) {
      const e = err as Error
      console.error("Error searching memories:", e)
      setError(e.message)
      toast.error(`Search failed: ${e.message}`)
      setMemories([])
    } finally {
      setLoading(false)
    }
  }

  const getListViewMemories = () => {
    if (!memories || memories.length === 0) return []
    const flatMemories = flattenMemoriesForList(memories)
    // Sort first by level (maintaining hierarchy), then by vector_distance within each level
    // Lower vector_distance means better match
    return flatMemories.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level // Sort by level first (lower levels first)
      }
      return b.vector_distance - a.vector_distance // Then by vector_distance (higher value first for better matches)
    })
  }
  const listViewMemories = getListViewMemories()

  const handleCopy = useCallback(
    (memory: Memory, type: "prompt" | "response") => {
      const contentToCopy = type === "prompt" ? memory.prompt : memory.response
      if (!contentToCopy) {
        toast.error("No content to copy")
        return
      }
      navigator.clipboard.writeText(contentToCopy).then(
        () => toast.success("Copied to clipboard"),
        (err) => {
          console.error("Could not copy text: ", err)
          toast.error("Failed to copy text")
        }
      )
    },
    []
  )

  const handleDeleteMemory = useCallback(
    (memory: Memory) => {
      if (!memory.id) {
        toast.error("Cannot delete: Missing ID")
        return
      }
      confirmMemoryDeletion(memory.id, {
        isMessage: true,
        onSuccess: () => {
          setMemories((prevMemories) => {
            const removeMemory = (mems: Memory[]): Memory[] =>
              mems.filter((mem) => {
                if (mem.id === memory.id) return false
                if (mem.children && mem.children.length > 0)
                  mem.children = removeMemory(mem.children)
                return true
              })
            return removeMemory([...prevMemories])
          })
          toast.success("Memory deleted successfully")
        },
      })
    },
    [confirmMemoryDeletion]
  )

  const handleShowRelatedMemories = useCallback(
    (memory: Memory) => {
      showMemoryNetwork(memory) // This will open the MemoryNetworkModal
    },
    [showMemoryNetwork]
  )

  return (
    <Modal id="memories" title="Memory Dashboard">
      <div className="flex flex-col h-full p-4 bg-background text-foreground">
        <div className="flex flex-col gap-4 pb-4 border-b border-border mb-4">
          <SearchBar
            onSearch={handleSearch}
            inputRef={searchInputRef}
            loading={loading}
            currentQuery={lastSearchedTerm}
          />
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-3">
              <Button
                variant={activeView === "list" ? "default" : "outline"}
                onClick={() => setActiveView("list")}
                className={
                  activeView === "list"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border"
                }
              >
                <List size={18} />
                <span>List</span>
              </Button>
              <Button
                variant={activeView === "network" ? "default" : "outline"}
                onClick={() => setActiveView("network")}
                className={
                  activeView === "network"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border"
                }
              >
                <Network size={18} />
                <span>Network</span>
              </Button>
            </div>
            <div className="flex items-center gap-1 text-sm opacity-95 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 shadow-sm">
              <span className="font-bold text-primary text-base">
                {formatCount(memoryCount)}
              </span>
              <span className="text-muted-foreground font-medium">
                memories
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto py-2 min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-lg m-auto">
              Searching memories...
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-destructive text-lg text-center gap-3 bg-destructive/10 rounded-lg p-6 m-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/20">
                <LucideX size={20} />
              </div>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && memories.length === 0 && lastSearchedTerm && (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-muted-foreground text-lg text-center gap-3">
              <Info size={24} />
              <p>
                No memories found for &quot;{lastSearchedTerm}&quot;. Try a
                different search.
              </p>
            </div>
          )}
          {!loading && !error && memories.length === 0 && !lastSearchedTerm && (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-muted-foreground text-lg text-center gap-3">
              <Info size={24} />
              <p>Enter a search term and click Search to find your memories.</p>
            </div>
          )}
          {!loading && !error && memories.length > 0 && (
            <>
              {activeView === "list" ? (
                <MemoriesListView
                  memories={listViewMemories}
                  onCopy={handleCopy}
                  onDelete={handleDeleteMemory}
                  onShowMemories={handleShowRelatedMemories}
                />
              ) : (
                <MemoriesNetworkGraph
                  memories={memories} // Pass the raw, hierarchical memories
                  rootNodeConfig={{
                    id: "search-query-node",
                    label: lastSearchedTerm,
                    title: `Your search: ${lastSearchedTerm}`,
                    isQueryNode: true,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
