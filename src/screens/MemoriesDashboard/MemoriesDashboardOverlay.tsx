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
  loadingType: "initial" | "search" | "reset" | null
  error: string | null
  searchTerm: string
  isInitialLoad: boolean
  pairDetails: Record<string, ComprehensivePairDetails>
  showTopSubjectsModal: boolean
  showSearchQueryModal: boolean
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

  // Cache for top subjects data to make reset instant
  const topSubjectsCacheRef = useRef<{
    memories: Memory[]
    pairDetails: Record<string, ComprehensivePairDetails>
  } | null>(null)

  const [networkState, setNetworkState] = useState<NetworkState>({
    memories: [],
    loading: true,
    loadingType: "initial",
    error: null,
    searchTerm: "",
    isInitialLoad: true,
    pairDetails: {},
    showTopSubjectsModal: false,
    showSearchQueryModal: false,
  })
  const [viewMode, setViewMode] = useState<"cards" | "graph">("graph")

  // Clear cache when component unmounts (modal closes)
  useEffect(() => {
    return () => {
      console.log("🗑️ Clearing top subjects cache on modal close")
      topSubjectsCacheRef.current = null
    }
  }, [])

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

  // Shared function to load top subjects with optimized endpoint
  const loadTopSubjectsData = useCallback(async () => {
    if (!user?.uid || !preferences || !topSubjects.length) {
      return { memories: [], pairDetails: {} }
    }

    console.log("🔄 Loading top subjects data using optimized endpoint...")

    // Use the optimized endpoint that fetches top subjects with recent pairs in a single call
    const { getTopSubjectsWithPairs } = await import("@/api/kg")

    const topSubjectsWithPairsResult = await getTopSubjectsWithPairs({
      userID: user.uid,
      limit: 8, // Limit to top 8 subjects for performance
      pairsPerSubject: 3, // Get 3 recent memories per subject
    })

    const allMemories: Memory[] = []
    const allPairDetails: Record<string, ComprehensivePairDetails> = {}

    if (topSubjectsWithPairsResult.ok) {
      // Process the optimized response
      console.log(
        "✅ Using optimized endpoint with",
        topSubjectsWithPairsResult.ok.results.length,
        "subjects"
      )

      topSubjectsWithPairsResult.ok.results.forEach((subject) => {
        subject.recent_pairs.forEach((pair) => {
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

          // Store basic pair info
          allPairDetails[pair.id] = {
            id: pair.id,
            title: pair.title || "Memory Pair",
            description: "", // Will be populated by getComprehensivePairDetails if needed
            timestamp: pair.timestamp ? pair.timestamp.toISOString() : null,
            timestamp_formatted: pair.timestamp_formatted || "",
            subjects: [], // Will be populated by getComprehensivePairDetails
          }
        })
      })

      console.log(
        "✅ Optimized endpoint provided",
        allMemories.length,
        "memories"
      )
    } else {
      console.warn(
        "❌ Optimized endpoint failed:",
        topSubjectsWithPairsResult.err
      )
      console.log("⏳ Falling back to sequential approach...")

      // FALLBACK: Use the old sequential approach if the optimized endpoint fails
      const { getSubjectPairsRecent } = await import("@/api/kg")

      for (const subject of topSubjects.slice(0, 8)) {
        try {
          const recentPairsResult = await getSubjectPairsRecent({
            userID: user.uid,
            subjectID: subject.id,
            limit: 3,
            offset: 0,
          })

          if (recentPairsResult.ok && recentPairsResult.ok.results.length > 0) {
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

              allPairDetails[pair.id] = {
                id: pair.id,
                title: pair.title || "Memory Pair",
                description: pair.summary || "",
                timestamp: pair.timestamp ? pair.timestamp.toISOString() : null,
                timestamp_formatted: pair.timestamp_formatted || "",
                subjects: [],
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
    }

    // Check if we have enough memories, regardless of which method was used
    if (allMemories.length < 5) {
      console.log(
        "⚠️ Still not enough memories (" +
          allMemories.length +
          "), trying embedding search fallback"
      )
      // If we don't have enough memories from subjects, fall back to embedding search
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

    return { memories: allMemories, pairDetails: allPairDetails }
  }, [
    user?.uid,
    preferences,
    topSubjects,
    createTopSubjectsPrompt,
    collectPairIds,
  ])

  // Initialize the network with top subjects as a synthetic "search"
  useEffect(() => {
    const initializeNetwork = async () => {
      if (!user?.uid || !preferences || statsLoading || !topSubjects.length) {
        return
      }

      try {
        setNetworkState((prev) => ({ ...prev, loading: true, error: null }))

        const { memories, pairDetails } = await loadTopSubjectsData()

        // Cache the top subjects data for instant reset
        topSubjectsCacheRef.current = { memories, pairDetails }

        setNetworkState({
          memories: memories,
          loading: false,
          loadingType: null,
          error: null,
          searchTerm: "Top Memory Subjects",
          isInitialLoad: false,
          pairDetails: pairDetails,
          showTopSubjectsModal: false,
          showSearchQueryModal: false,
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
    loadTopSubjectsData,
  ])

  // Handle manual search - now will be called from MemoriesNetworkGraph
  const handleSearch = useCallback(
    async (searchTerm: string) => {
      if (!user?.uid || !preferences) {
        toast.error("User not authenticated")
        return
      }

      try {
        setNetworkState((prev) => ({
          ...prev,
          loading: true,
          loadingType: "search",
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
          loadingType: null,
          error: null,
          pairDetails,
        }))
      } catch (error) {
        console.error("Search error:", error)
        setNetworkState((prev) => ({
          ...prev,
          loading: false,
          loadingType: null,
          error: error instanceof Error ? error.message : "Search failed",
        }))
        toast.error("Search failed. Please try again.")
      }
    },
    [user?.uid, preferences, collectPairIds]
  )

  // Reset to top subjects view - now will be called from MemoriesNetworkGraph
  const resetToTopSubjects = useCallback(async () => {
    if (!user?.uid || !preferences || !topSubjects.length) {
      return
    }

    // Check if we have cached data for instant reset
    if (topSubjectsCacheRef.current) {
      console.log("✅ Using cached top subjects data for instant reset")
      setNetworkState({
        memories: topSubjectsCacheRef.current.memories,
        loading: false,
        loadingType: null,
        error: null,
        searchTerm: "Top Memory Subjects",
        isInitialLoad: false,
        pairDetails: topSubjectsCacheRef.current.pairDetails,
        showTopSubjectsModal: false,
        showSearchQueryModal: false,
      })
      return
    }

    try {
      setNetworkState((prev) => ({
        ...prev,
        loading: true,
        loadingType: "reset",
        error: null,
        searchTerm: "Top Memory Subjects",
        isInitialLoad: false,
        showTopSubjectsModal: false,
      }))

      console.log("🔄 Resetting to optimized top subjects view...")

      const { memories, pairDetails } = await loadTopSubjectsData()

      // Update cache
      topSubjectsCacheRef.current = { memories, pairDetails }

      setNetworkState({
        memories: memories,
        loading: false,
        loadingType: null,
        error: null,
        searchTerm: "Top Memory Subjects",
        isInitialLoad: false,
        pairDetails: pairDetails,
        showTopSubjectsModal: false,
        showSearchQueryModal: false,
      })
    } catch (error) {
      console.error("Error resetting to top subjects:", error)
      setNetworkState((prev) => ({
        ...prev,
        loading: false,
        loadingType: null,
        error: error instanceof Error ? error.message : "Failed to reset",
        isInitialLoad: false,
      }))
    }
  }, [
    user?.uid,
    preferences,
    topSubjects,
    createTopSubjectsPrompt,
    loadTopSubjectsData,
  ])

  // Handle neural subject click to run as query
  const handleSubjectClick = useCallback(
    async (subjectText: string) => {
      // Close the modal first
      setNetworkState((prev) => ({ ...prev, showTopSubjectsModal: false }))

      // Call the search handler directly with the subject text
      await handleSearch(subjectText)
    },
    [handleSearch]
  )

  // Handle root node click to show appropriate modal
  const handleRootNodeClick = useCallback(() => {
    setNetworkState((prev) => {
      if (prev.searchTerm === "Top Memory Subjects") {
        // Show top subjects modal for initial view
        return { ...prev, showTopSubjectsModal: true }
      } else {
        // Show search query modal for search results
        return { ...prev, showSearchQueryModal: true }
      }
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
      // Add search-specific data for the root node modal
      searchData: {
        searchTerm: networkState.searchTerm,
        resultCount: networkState.memories.length,
        timestamp: new Date().toISOString(),
      },
    }),
    [networkState.searchTerm, networkState.memories.length]
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
                      {networkState.loadingType === "search"
                        ? "Searching neural pathways..."
                        : networkState.loadingType === "reset"
                          ? "Loading top subjects..."
                          : "Loading memory network..."}
                    </p>
                    <div className="neural-connection w-32" />
                  </div>
                </div>
              )}

              {/* Network Graph with integrated controls - hidden during loading */}
              {!networkState.loading && (
                <MemoriesNetworkGraph
                  memories={networkState.memories}
                  rootNodeConfig={rootNodeConfig}
                  pairDetails={networkState.pairDetails}
                  onRootNodeClick={handleRootNodeClick}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  showCardViewControls={false}
                  context="dashboard"
                  onSearch={handleSearch}
                  onReset={resetToTopSubjects}
                  searchLoading={networkState.loading}
                />
              )}
            </>
          )}
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
              className="neural-dashboard-legend fixed z-[100] bg-background/95 border border-border/50 rounded-lg p-4 shadow-lg"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                // Ensure proper mobile positioning
                position: "fixed",
                width: "min(90vw, 420px)",
                maxWidth: "90vw",
                maxHeight: "80vh",
                margin: 0,
                // Force visibility
                visibility: "visible",
                opacity: 1,
                // Ensure centering works on all devices
                marginLeft: 0,
                marginRight: 0,
                // Prevent any box-sizing issues
                boxSizing: "border-box",
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

        {/* Search Query Modal */}
        {networkState.showSearchQueryModal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[99] bg-black/30"
              onClick={() =>
                setNetworkState((prev) => ({
                  ...prev,
                  showSearchQueryModal: false,
                }))
              }
            />
            <div
              className="neural-dashboard-legend fixed z-[100] bg-background/95 border border-border/50 rounded-lg p-4 shadow-lg"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                // Ensure proper mobile positioning
                position: "fixed",
                width: "min(90vw, 420px)",
                maxWidth: "90vw",
                maxHeight: "80vh",
                margin: 0,
                // Force visibility
                visibility: "visible",
                opacity: 1,
                // Ensure centering works on all devices
                marginLeft: 0,
                marginRight: 0,
                // Prevent any box-sizing issues
                boxSizing: "border-box",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-primary flex items-center gap-2 neural-glow">
                  <Target className="h-4 w-4 neural-pulse" />
                  Search Query Details
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setNetworkState((prev) => ({
                      ...prev,
                      showSearchQueryModal: false,
                    }))
                  }
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground neural-glow"
                >
                  ×
                </Button>
              </div>
              <div className="space-y-3">
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <h5 className="font-medium text-primary mb-2">
                    Search Query
                  </h5>
                  <p className="text-sm text-foreground">
                    &ldquo;{networkState.searchTerm}&rdquo;
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-muted-foreground block">
                      Results Found
                    </span>
                    <span className="font-semibold text-foreground">
                      {networkState.memories.length} memories
                    </span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-muted-foreground block">
                      Search Time
                    </span>
                    <span className="font-semibold text-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {networkState.memories.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h5 className="font-medium text-foreground mb-2">
                      Memory Types Found
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const types = new Map<string, number>()
                        networkState.memories.forEach((memory) => {
                          const prompt = memory.prompt?.toLowerCase() || ""
                          let type = "thought"
                          if (prompt.includes("?")) type = "question"
                          else if (
                            prompt.includes("create") ||
                            prompt.includes("make") ||
                            prompt.includes("generate")
                          )
                            type = "creative"
                          else if (
                            prompt.includes("remind") ||
                            prompt.includes("remember")
                          )
                            type = "reminder"
                          else if (
                            prompt.includes("analyze") ||
                            prompt.includes("think")
                          )
                            type = "analysis"

                          types.set(type, (types.get(type) || 0) + 1)
                        })
                        return Array.from(types.entries()).map(
                          ([type, count]) => (
                            <span
                              key={type}
                              className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full border border-primary/30"
                            >
                              {type} ({count})
                            </span>
                          )
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div className="neural-connection"></div>
              <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                💡 This search explored your neural pathways for relevant
                memories
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
