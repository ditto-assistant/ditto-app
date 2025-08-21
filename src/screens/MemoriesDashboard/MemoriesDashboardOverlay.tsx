import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import {
  Search,
  Brain,
  BarChart3,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { useMemoryStats } from "@/hooks/useMemoryStats"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { embed } from "@/api/embed"
import { getMemories, Memory } from "@/api/getMemories"
import { getComprehensivePairDetails, ComprehensivePairDetails } from "@/api/kg"
import MemoriesNetworkGraph from "./MemoriesNetworkGraph"
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import "@/components/MemoryNetwork.css"

interface NetworkState {
  memories: Memory[]
  loading: boolean
  error: string | null
  searchTerm: string
  isInitialLoad: boolean
  pairDetails: Record<string, ComprehensivePairDetails>
  showTopSubjectsModal: boolean
}

export default function MemoriesDashboardOverlay() {
  const { user } = useAuth()
  const { preferences } = useModelPreferences()
  const {
    totalMemoryCount,
    topSubjects,
    loading: statsLoading,
    error: statsError,
  } = useMemoryStats(15)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const [networkState, setNetworkState] = useState<NetworkState>({
    memories: [],
    loading: true,
    error: null,
    searchTerm: "",
    isInitialLoad: true,
    pairDetails: {},
    showTopSubjectsModal: false,
  })
  const [searchExpanded, setSearchExpanded] = useState(false)

  // Helper function to collect all pair IDs from memories
  const collectPairIds = useCallback((memories: Memory[]): string[] => {
    const ids = new Set<string>()
    const collectFromMemory = (memory: Memory) => {
      ids.add(memory.id)
      if (memory.children) {
        memory.children.forEach(collectFromMemory)
      }
    }
    memories.forEach(collectFromMemory)
    return Array.from(ids)
  }, [])

  // Create initial network view from top subjects
  const createTopSubjectsPrompt = useCallback(() => {
    if (topSubjects.length === 0) return ""

    const subjectsList = topSubjects
      .slice(0, 10) // Show top 10 subjects
      .map(
        (subject) =>
          `• ${subject.subject_text} (${subject.pair_count} memories)`
      )
      .join("\n")

    return `Here are my most important memory subjects:\n\n${subjectsList}\n\nThese represent the key topics and themes in my conversations with you.`
  }, [topSubjects])

  // Initialize the network with top subjects as a synthetic "search"
  useEffect(() => {
    const initializeNetwork = async () => {
      if (!user?.uid || !preferences || statsLoading || !topSubjects.length) {
        return
      }

      try {
        setNetworkState((prev) => ({ ...prev, loading: true, error: null }))

        // Instead of using embedding search for top subjects, get recent memories for each subject
        // This ensures all top subjects are represented with actual connections
        const { getSubjectPairsRecent } = await import("@/api/kg")

        // Collect memories from top subjects (up to 3 memories per subject to avoid too many nodes)
        const allMemories: Memory[] = []
        const allPairDetails: Record<string, ComprehensivePairDetails> = {}

        for (const subject of topSubjects.slice(0, 8)) {
          // Limit to top 8 subjects for performance
          try {
            const recentPairsResult = await getSubjectPairsRecent({
              userID: user.uid,
              subjectID: subject.id,
              limit: 3, // Get 3 recent memories per subject
              offset: 0,
            })

            if (
              recentPairsResult.ok &&
              recentPairsResult.ok.results.length > 0
            ) {
              // Convert pair results to Memory format and collect pair details
              recentPairsResult.ok.results.forEach((pair) => {
                const memory: Memory = {
                  id: pair.id,
                  prompt: pair.prompt || "",
                  response: pair.response || "",
                  timestamp: pair.timestamp || new Date(),
                  score: pair.score || 1.0,
                  vector_distance: pair.vector_distance || 0.0,
                  depth: pair.depth || 1,
                  similarity: pair.similarity,
                  children: [],
                }
                allMemories.push(memory)

                // We'll get the comprehensive pair details (including subjects) later
                // For now, just store basic pair info
                allPairDetails[pair.id] = {
                  id: pair.id,
                  title: pair.title || "Memory Pair",
                  description: pair.summary || "",
                  timestamp: pair.timestamp
                    ? pair.timestamp.toISOString()
                    : null,
                  timestamp_formatted: pair.timestamp_formatted || "",
                  subjects: [], // Will be populated by getComprehensivePairDetails
                }
              })
            }
          } catch (error) {
            console.warn(
              `Failed to fetch memories for subject ${subject.subject_text}:`,
              error
            )
          }
        }

        // If we don't have enough memories from subjects, fall back to embedding search
        if (allMemories.length < 5) {
          console.log(
            "Not enough memories from subjects, falling back to embedding search"
          )
          const prompt = createTopSubjectsPrompt()
          const embeddingResult = await embed({
            userID: user.uid,
            text: prompt,
            model: "text-embedding-005",
          })

          if (embeddingResult.ok) {
            const memoriesResponse = await getMemories(
              {
                userID: user.uid,
                longTerm: {
                  vector: embeddingResult.ok,
                  nodeCounts: preferences.memory.longTermMemoryChain,
                },
                stripImages: false,
              },
              "application/json"
            )

            if (memoriesResponse.ok) {
              const fallbackMemories = memoriesResponse.ok?.longTerm || []
              // Merge with existing memories (avoid duplicates)
              const existingIds = new Set(allMemories.map((m) => m.id))
              fallbackMemories.forEach((memory) => {
                if (!existingIds.has(memory.id)) {
                  allMemories.push(memory)
                }
              })
            }
          }
        }

        // Fetch comprehensive pair details for all collected memories
        const allPairIds = collectPairIds(allMemories)

        if (allPairIds.length > 0) {
          const detailsResp = await getComprehensivePairDetails({
            pairIDs: allPairIds,
          })
          if (detailsResp.ok) {
            // Merge with existing pair details
            Object.assign(allPairDetails, detailsResp.ok)
          }
        }

        setNetworkState({
          memories: allMemories,
          loading: false,
          error: null,
          searchTerm: "Top Memory Subjects",
          isInitialLoad: false,
          pairDetails: allPairDetails,
          showTopSubjectsModal: false,
        })
      } catch (error) {
        console.error("Error initializing network:", error)
        setNetworkState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load memory network",
          isInitialLoad: false,
        }))
      }
    }

    initializeNetwork()
  }, [
    user?.uid,
    preferences,
    topSubjects,
    statsLoading,
    createTopSubjectsPrompt,
    collectPairIds,
  ])

  // Handle manual search
  const handleSearch = useCallback(async () => {
    const searchTerm = searchInputRef.current?.value?.trim()
    if (!searchTerm) {
      toast.error("Please enter a search term")
      return
    }

    if (!user?.uid || !preferences) {
      toast.error("User not authenticated")
      return
    }

    try {
      setNetworkState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        searchTerm,
        showTopSubjectsModal: false,
      }))

      const embeddingResult = await embed({
        userID: user.uid,
        text: searchTerm,
        model: "text-embedding-005",
      })

      if (embeddingResult.err) {
        throw new Error(`Embedding failed: ${embeddingResult.err}`)
      }

      const memoriesResponse = await getMemories(
        {
          userID: user.uid,
          longTerm: {
            vector: embeddingResult.ok,
            nodeCounts: preferences.memory.longTermMemoryChain,
          },
          stripImages: false,
        },
        "application/json"
      )

      if (memoriesResponse.err) {
        throw new Error(memoriesResponse.err)
      }

      const memories = memoriesResponse.ok?.longTerm || []

      // Fetch pair details for search results
      const allPairIds = collectPairIds(memories)
      let pairDetails: Record<string, ComprehensivePairDetails> = {}

      if (allPairIds.length > 0) {
        const detailsResp = await getComprehensivePairDetails({
          pairIDs: allPairIds,
        })
        if (detailsResp.ok) {
          pairDetails = detailsResp.ok
        }
      }

      setNetworkState((prev) => ({
        ...prev,
        memories,
        loading: false,
        error: null,
        pairDetails,
      }))
    } catch (error) {
      console.error("Search error:", error)
      setNetworkState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Search failed",
      }))
      toast.error("Search failed. Please try again.")
    }
  }, [user?.uid, preferences, collectPairIds])

  // Handle Enter key in search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // Reset to top subjects view
  const resetToTopSubjects = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }
    setSearchExpanded(false) // Collapse search on reset

    const prompt = createTopSubjectsPrompt()
    setNetworkState((prev) => ({
      ...prev,
      searchTerm: "Top Memory Subjects",
      isInitialLoad: false,
      showTopSubjectsModal: false,
    }))

    // Re-trigger search with top subjects
    if (user?.uid && preferences && topSubjects.length > 0) {
      embed({
        userID: user.uid,
        text: prompt,
        model: "text-embedding-005",
      }).then((embeddingResult) => {
        if (embeddingResult.ok) {
          getMemories(
            {
              userID: user.uid,
              longTerm: {
                vector: embeddingResult.ok,
                nodeCounts: preferences.memory.longTermMemoryChain,
              },
              stripImages: false,
            },
            "application/json"
          ).then(async (memoriesResponse) => {
            if (memoriesResponse.ok) {
              const memories = memoriesResponse.ok?.longTerm || []

              // Fetch pair details
              const allPairIds = collectPairIds(memories)
              let pairDetails: Record<string, ComprehensivePairDetails> = {}

              if (allPairIds.length > 0) {
                const detailsResp = await getComprehensivePairDetails({
                  pairIDs: allPairIds,
                })
                if (detailsResp.ok) {
                  pairDetails = detailsResp.ok
                }
              }

              setNetworkState((prev) => ({
                ...prev,
                memories,
                loading: false,
                error: null,
                pairDetails,
              }))
            }
          })
        }
      })
    }
  }, [
    user?.uid,
    preferences,
    topSubjects,
    createTopSubjectsPrompt,
    collectPairIds,
  ])

  // Handle neural subject click to run as query
  const handleSubjectClick = useCallback(
    async (subjectText: string) => {
      // Close the modal first
      setNetworkState((prev) => ({ ...prev, showTopSubjectsModal: false }))

      // Set the search term in the input
      if (searchInputRef.current) {
        searchInputRef.current.value = subjectText
      }

      // Don't change search expanded state - keep it as is

      if (!user?.uid || !preferences) {
        toast.error("User not authenticated")
        return
      }

      try {
        setNetworkState((prev) => ({
          ...prev,
          loading: true,
          error: null,
          searchTerm: subjectText,
          showTopSubjectsModal: false,
        }))

        const embeddingResult = await embed({
          userID: user.uid,
          text: subjectText,
          model: "text-embedding-005",
        })

        if (embeddingResult.err) {
          throw new Error(`Embedding failed: ${embeddingResult.err}`)
        }

        const memoriesResponse = await getMemories(
          {
            userID: user.uid,
            longTerm: {
              vector: embeddingResult.ok,
              nodeCounts: preferences.memory.longTermMemoryChain,
            },
            stripImages: false,
          },
          "application/json"
        )

        if (memoriesResponse.err) {
          throw new Error(memoriesResponse.err)
        }

        const memories = memoriesResponse.ok?.longTerm || []

        // Fetch pair details for search results
        const allPairIds = collectPairIds(memories)
        let pairDetails: Record<string, ComprehensivePairDetails> = {}

        if (allPairIds.length > 0) {
          const detailsResp = await getComprehensivePairDetails({
            pairIDs: allPairIds,
          })
          if (detailsResp.ok) {
            pairDetails = detailsResp.ok
          }
        }

        setNetworkState((prev) => ({
          ...prev,
          memories,
          loading: false,
          error: null,
          pairDetails,
        }))

        // No toast notification for smooth UX
      } catch (error) {
        console.error("Subject search error:", error)
        setNetworkState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Search failed",
        }))
        toast.error("Search failed. Please try again.")
      }
    },
    [user?.uid, preferences, collectPairIds]
  )

  // Handle root node click to show top subjects
  const handleRootNodeClick = useCallback(() => {
    setNetworkState((prev) => {
      // Only show modal if we're in top subjects view
      if (prev.searchTerm === "Top Memory Subjects") {
        return { ...prev, showTopSubjectsModal: true }
      }
      return prev
    })
  }, []) // No dependencies to prevent network re-render

  // Memoize rootNodeConfig to prevent unnecessary re-renders
  const rootNodeConfig = useMemo(
    () => ({
      id: "search-query-node",
      label: networkState.searchTerm,
      title: `Your search: ${networkState.searchTerm}`,
      isQueryNode: true,
      color: "#7289da",
    }),
    [networkState.searchTerm]
  )

  // Format count for display
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <Modal id="memories" title="Neural Memory Network">
      <div className="neural-dashboard-container flex flex-col h-full bg-background text-foreground relative overflow-hidden">
        {/* Compact Header with Collapsible Search */}
        <div className="neural-dashboard-header relative z-20 bg-background/95 backdrop-blur-sm border-b border-border/50">
          {/* Top Row - Compact Controls */}
          <div className="flex items-center justify-between p-3">
            {/* Left Side - Reset Button */}
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToTopSubjects}
                className="neural-dashboard-compact-button text-primary hover:text-primary/80 hover:bg-primary/10 neural-glow px-2 py-1 h-8"
                title="Reset to Top Subjects"
              >
                <RotateCcw className="h-4 w-4 neural-pulse" />
              </Button>
            </div>

            {/* Center - Query Title */}
            <div className="flex-1 flex justify-center">
              <div className="neural-dashboard-stats-card text-sm text-primary font-semibold bg-primary/10 border border-primary/30 rounded-full px-4 md:px-5 py-1.5 neural-glow flex items-center gap-2 max-w-[85vw] md:max-w-xl whitespace-nowrap">
                <Target className="h-4 w-4 neural-pulse" />
                {networkState.searchTerm || "Loading..."}
              </div>
            </div>

            {/* Right Side - Search Toggle */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchExpanded(!searchExpanded)}
                className="neural-dashboard-search-toggle text-muted-foreground hover:text-foreground px-2 py-1 h-8"
                title={searchExpanded ? "Hide Search" : "Show Search"}
              >
                {searchExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Collapsible Search Section */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden",
              searchExpanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="p-3 pt-0">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 neural-glow" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search your neural memories..."
                    className="neural-dashboard-search-input pl-10 bg-background/80 border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    onKeyPress={handleKeyPress}
                    disabled={networkState.loading}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={networkState.loading}
                  className="neural-dashboard-button px-4 bg-primary hover:bg-primary/90 h-9"
                >
                  {networkState.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </div>
            <div className="neural-connection mx-3 mb-3"></div>
          </div>
        </div>

        {/* Network Visualization */}
        <div className="flex-1 relative overflow-hidden">
          {statsLoading || networkState.isInitialLoad ? (
            <div className="neural-dashboard-loading absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-30">
              <div className="flex flex-col items-center gap-4 text-center max-w-md p-8">
                <div className="relative">
                  <Brain className="h-16 w-16 text-primary neural-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  <div
                    className="absolute inset-0 rounded-full border-2 border-secondary/20 animate-ping"
                    style={{ animationDelay: "0.5s" }}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground neural-glow">
                    Initializing Memory Network
                  </h3>
                  <p className="text-muted-foreground">
                    Loading your memory subjects and building the knowledge
                    graph...
                  </p>
                  <div className="neural-connection" />
                </div>
                <LoadingSpinner size={24} inline={true} />
              </div>
            </div>
          ) : statsError || networkState.error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="max-w-md space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto neural-glow">
                  <Target className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold neural-glow">
                  Unable to Load Network
                </h3>
                <p className="text-muted-foreground">
                  {statsError || networkState.error}
                </p>
                <div className="neural-connection" />
                <Button
                  onClick={resetToTopSubjects}
                  variant="outline"
                  className="neural-dashboard-button"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : networkState.memories.length === 0 && !networkState.loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="max-w-md space-y-4">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto neural-pulse" />
                <h3 className="text-xl font-semibold neural-glow">
                  No Neural Pathways Found
                </h3>
                <p className="text-muted-foreground">
                  No memories match your search. Try a different term or return
                  to your top subjects.
                </p>
                <div className="neural-connection" />
                <Button
                  onClick={resetToTopSubjects}
                  variant="outline"
                  className="neural-dashboard-button"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Top Subjects
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Loading overlay for searches */}
              {networkState.loading && (
                <div className="neural-dashboard-loading absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary neural-glow" />
                    <p className="text-sm text-muted-foreground">
                      Searching neural pathways...
                    </p>
                    <div className="neural-connection w-32" />
                  </div>
                </div>
              )}

              {/* Network Graph */}
              <MemoriesNetworkGraph
                memories={networkState.memories}
                rootNodeConfig={rootNodeConfig}
                pairDetails={networkState.pairDetails}
                onRootNodeClick={handleRootNodeClick}
              />
            </>
          )}
        </div>

        {/* Floating Memory Count - top center of network area */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1 shadow-md flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary neural-glow" />
          <span className="font-bold text-primary">
            {formatCount(totalMemoryCount)} Memories
          </span>
        </div>

        {/* Top Subjects Modal */}
        {networkState.showTopSubjectsModal && topSubjects.length > 0 && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[99] bg-black/30"
              onClick={() =>
                setNetworkState((prev) => ({
                  ...prev,
                  showTopSubjectsModal: false,
                }))
              }
            />
            <div
              className="neural-dashboard-legend fixed z-[100] bg-background/95 border border-border/50 rounded-lg p-4 w-[min(90vw,420px)] max-w-[90vw] shadow-lg"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                // Ensure proper mobile positioning
                position: "fixed",
                maxHeight: "80vh",
                margin: 0,
                // Force visibility
                visibility: "visible",
                opacity: 1,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-primary flex items-center gap-2 neural-glow">
                  <Brain className="h-4 w-4 neural-pulse" />
                  Top Neural Subjects
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setNetworkState((prev) => ({
                      ...prev,
                      showTopSubjectsModal: false,
                    }))
                  }
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground neural-glow"
                >
                  ×
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {topSubjects.slice(0, 8).map((subject, index) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSubjectClick(subject.subject_text)}
                    className="neural-dashboard-legend-item flex items-center justify-between text-xs bg-muted/50 rounded-md px-2 py-1.5 transition-all hover:bg-muted/70 hover:bg-primary/10 cursor-pointer w-full text-left border border-transparent hover:border-primary/30"
                  >
                    <span className="font-medium text-foreground truncate flex-1 mr-2">
                      {subject.subject_text}
                    </span>
                    <span className="text-muted-foreground font-mono neural-glow">
                      {subject.pair_count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="neural-connection"></div>
              <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                Neural pathways connecting{" "}
                <span className="neural-glow font-medium">
                  {formatCount(totalMemoryCount)}
                </span>{" "}
                memories
              </div>
              <p className="text-xs text-muted-foreground/80 mt-2 italic">
                💡 Click any subject to explore its memories
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
