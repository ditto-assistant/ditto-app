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
import { searchSubjects, getSubjectPairs, searchPairs, getTopSubjects, getSubjectPairsRecent } from "@/api/kg"
import type { Subject, Pair } from "@/types/common"
import SubjectSelector from "./SubjectSelector"

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

// Utility function to deduplicate subjects by ID
const deduplicateSubjects = (existingSubjects: Subject[], newSubjects: Subject[]): Subject[] => {
  const existingIds = new Set(existingSubjects.map(s => s.id))
  const uniqueNewSubjects = newSubjects.filter(s => !existingIds.has(s.id))
  return [...existingSubjects, ...uniqueNewSubjects]
}

// Utility function to deduplicate pairs by ID
const deduplicatePairs = (existingPairs: Pair[], newPairs: Pair[]): Pair[] => {
  const existingIds = new Set(existingPairs.map(p => p.id))
  const uniqueNewPairs = newPairs.filter(p => !existingIds.has(p.id))
  return [...existingPairs, ...uniqueNewPairs]
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
  // Subject search and selection state
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [pairs, setPairs] = useState<Pair[]>([])
  const [pairsLoading, setPairsLoading] = useState(false)
  const [pairsError, setPairsError] = useState<string | null>(null)
  const [lastSubjectSearch, setLastSubjectSearch] = useState("")
  const [subjectsCollapsed, setSubjectsCollapsed] = useState(false)
  // New state for pagination and mode tracking
  const [subjectsOffset, setSubjectsOffset] = useState(0)
  const [hasMoreSubjects, setHasMoreSubjects] = useState(true)
  const [showMoreLoading, setShowMoreLoading] = useState(false)
  const [isSubjectSearchMode, setIsSubjectSearchMode] = useState(false)
  const [pairsOffset, setPairsOffset] = useState(0)
  const [hasMorePairs, setHasMorePairs] = useState(true)
  const [isLoadingMorePairs, setIsLoadingMorePairs] = useState(false)

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

  // Fetch top 10 subjects on mount
  useEffect(() => {
    const fetchTopSubjects = async () => {
      if (!user?.uid) return
      setSubjectsLoading(true)
      setSubjectsError(null)
      setSubjectsOffset(0)
      try {
        const res = await getTopSubjects({ userID: user.uid, limit: 10, offset: 0 })
        if (res.err) throw new Error(res.err)
        const results = res.ok?.results || []
        // Ensure no duplicates in initial results
        const uniqueResults = results.filter((subject, index, self) => 
          index === self.findIndex(s => s.id === subject.id)
        )
        setSubjects(uniqueResults)
        setHasMoreSubjects(results.length === 10) // If we got 10, there might be more
        setIsSubjectSearchMode(false)
      } catch (e: any) {
        setSubjectsError(e.message)
        setSubjects([])
        setHasMoreSubjects(false)
      } finally {
        setSubjectsLoading(false)
      }
    }
    fetchTopSubjects()
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

  // Subject search handler
  const handleSubjectSearch = async (query: string) => {
    if (!user?.uid) return
    setSubjectsLoading(true)
    setSubjectsError(null)
    setLastSubjectSearch(query)
    setIsSubjectSearchMode(true)
    setHasMoreSubjects(false) // No pagination for search results
    try {
      const res = await searchSubjects({ userID: user.uid, query, topK: 10 })
      if (res.err) throw new Error(res.err)
      const searchResults = res.ok?.results || []
      // Ensure no duplicates even in search results
      const uniqueResults = searchResults.filter((subject, index, self) => 
        index === self.findIndex(s => s.id === subject.id)
      )
      setSubjects(uniqueResults)
    } catch (e: any) {
      setSubjectsError(e.message)
      setSubjects([])
    } finally {
      setSubjectsLoading(false)
    }
  }

  // Show more subjects handler
  const handleShowMoreSubjects = async () => {
    if (!user?.uid || showMoreLoading) return
    setShowMoreLoading(true)
    try {
      const newOffset = subjectsOffset + 10
      const res = await getTopSubjects({ userID: user.uid, limit: 10, offset: newOffset })
      if (res.err) throw new Error(res.err)
      const newResults = res.ok?.results || []
      
      // Deduplicate subjects by ID to prevent duplicates
      setSubjects(prev => deduplicateSubjects(prev, newResults))
      
      setSubjectsOffset(newOffset)
      setHasMoreSubjects(newResults.length === 10) // If we got 10, there might be more
    } catch (e: any) {
      setSubjectsError(e.message)
    } finally {
      setShowMoreLoading(false)
    }
  }

  // Reset subject search handler
  const handleResetSubjectSearch = async () => {
    if (!user?.uid) return
    setSubjectsLoading(true)
    setSubjectsError(null)
    setLastSubjectSearch("")
    setIsSubjectSearchMode(false)
    setSubjectsOffset(0)
    try {
      const res = await getTopSubjects({ userID: user.uid, limit: 10, offset: 0 })
      if (res.err) throw new Error(res.err)
      const results = res.ok?.results || []
      // Ensure no duplicates when resetting
      const uniqueResults = results.filter((subject, index, self) => 
        index === self.findIndex(s => s.id === subject.id)
      )
      setSubjects(uniqueResults)
      setHasMoreSubjects(results.length === 10)
    } catch (e: any) {
      setSubjectsError(e.message)
      setSubjects([])
      setHasMoreSubjects(false)
    } finally {
      setSubjectsLoading(false)
    }
  }

  // Load recent pairs for selected subject
  const loadRecentPairs = async (subject: Subject, offset: number = 0, append: boolean = false) => {
    if (!user?.uid) return
    if (!append) {
      setPairsLoading(true)
      setPairsError(null)
      setPairsOffset(0)
    } else {
      setIsLoadingMorePairs(true)
    }
    
    try {
      const res = await getSubjectPairsRecent({
        userID: user.uid,
        subjectID: subject.id,
        subjectText: subject.subject_text,
        limit: 5,
        offset,
      })
      
      if (res.err) throw new Error(res.err)
      
      const newPairs = res.ok?.results || []
      if (append) {
        // Deduplicate pairs by ID to prevent duplicates, but maintain chronological order
        const deduplicatedPairs = deduplicatePairs(pairs, newPairs)
        setPairs(deduplicatedPairs)
        setPairsOffset(offset)
      } else {
        setPairs(newPairs)
        setPairsOffset(0)
      }
      setHasMorePairs(newPairs.length === 5) // If we got 5, there might be more
    } catch (e: any) {
      setPairsError(e.message)
      if (!append) {
        setPairs([])
      }
    } finally {
      if (append) {
        setIsLoadingMorePairs(false)
      } else {
        setPairsLoading(false)
      }
    }
  }

  // Load more pairs handler
  const handleLoadMorePairs = async () => {
    if (!selectedSubject || isLoadingMorePairs) return
    const newOffset = pairsOffset + 5
    await loadRecentPairs(selectedSubject, newOffset, true)
  }

  // Pair search within subject
  const handlePairSearch = async (query: string) => {
    if (!user?.uid || !selectedSubject) return
    setPairsLoading(true)
    setPairsError(null)
    console.log("🔍 Searching pairs for subject:", selectedSubject.subject_text, "with query:", query)
    try {
      const res = await getSubjectPairs({
        userID: user.uid,
        subjectID: selectedSubject.id,
        subjectText: selectedSubject.subject_text,
        query,
        topK: 10,
      })
      console.log("📡 KG API response:", res)
      
      if (res.err) throw new Error(res.err)
      
      console.log("📋 Raw results from KG:", res.ok?.results)
      console.log("📋 Results type:", typeof res.ok?.results)
      console.log("📋 Is array?", Array.isArray(res.ok?.results))
      
      // Only set pairs if results is an array
      if (Array.isArray(res.ok?.results)) {
        console.log(`✅ Setting ${res.ok.results.length} pairs`)
        setPairs(res.ok.results)
      } else {
        console.warn("⚠️ Results is not an array:", res.ok?.results)
        setPairs([])
        setPairsError(typeof res.ok?.results === 'string' ? res.ok.results : 'No results found.')
      }
    } catch (e: any) {
      console.error("❌ Error in handlePairSearch:", e)
      setPairsError(e.message)
      setPairs([])
    } finally {
      setPairsLoading(false)
    }
  }

  // Collapse subject list when rendering memory search results
  useEffect(() => {
    // Collapse if we are showing memory search results (pairs for a subject or general memory results)
    if ((selectedSubject && pairs.length > 0) || (!selectedSubject && memories.length > 0)) {
      setSubjectsCollapsed(true)
    }
  }, [selectedSubject, pairs.length, memories.length])

  return (
    <Modal id="memories" title="Memory Dashboard">
      <div className="flex flex-col h-full p-4 bg-background text-foreground">
        {/* Subject Selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-base">Subjects</span>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded bg-muted border border-border hover:bg-primary/10 transition-colors"
              onClick={() => setSubjectsCollapsed((c) => !c)}
            >
              {subjectsCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
          {subjectsCollapsed && selectedSubject ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">Selected:</span>
                <span className="text-sm text-foreground">{selectedSubject.subject_text}</span>
                {selectedSubject.pair_count && (
                  <span className="text-xs text-muted-foreground">({selectedSubject.pair_count} pairs)</span>
                )}
              </div>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted transition-colors"
                onClick={() => setSelectedSubject(null)}
              >
                Clear
              </button>
            </div>
          ) : !subjectsCollapsed ? (
            <SubjectSelector
              subjects={subjects}
              loading={subjectsLoading}
              error={subjectsError}
              selectedSubjectId={selectedSubject?.id || null}
              onSelect={(subject) => {
                setSelectedSubject(subject)
                setPairs([])
                setPairsError(null)
                setPairsOffset(0)
                setHasMorePairs(true)
                // Automatically load recent pairs for this subject
                loadRecentPairs(subject)
              }}
              onSearch={handleSubjectSearch}
              onShowMore={handleShowMoreSubjects}
              hasMore={hasMoreSubjects}
              showMoreLoading={showMoreLoading}
              isSearchMode={isSubjectSearchMode}
              onResetSearch={handleResetSubjectSearch}
            />
          ) : null}
        </div>
        {/* If a subject is selected, show pair search and results */}
        {selectedSubject ? (
          <div className="flex flex-col flex-1 gap-4">
            <div className="flex flex-col gap-4 pb-4 border-b border-border">
              <form
                className="flex gap-3 w-full"
                onSubmit={e => {
                  e.preventDefault()
                  const input = (e.currentTarget.elements.namedItem("pairSearch") as HTMLInputElement)
                  handlePairSearch(input.value)
                }}
                autoComplete="off"
              >
                <input
                  name="pairSearch"
                  type="text"
                  placeholder={`Search memory pairs in '${selectedSubject.subject_text}'...`}
                  className="flex-1 px-3 py-2 rounded border border-input bg-muted text-foreground text-sm focus:outline-none focus:border-primary"
                  disabled={pairsLoading}
                />
                <Button type="submit" disabled={pairsLoading} className="h-10 px-4 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/70 disabled:cursor-not-allowed">
                  {pairsLoading ? "Searching..." : "Search"}
                </Button>
              </form>
              {pairsError && <div className="text-destructive text-sm mt-1">{pairsError}</div>}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {!pairsLoading && pairs.length > 0 && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <MemoriesListView
                    memories={[...pairs].sort((a, b) => {
                      // Always maintain chronological order (newest first) for pairs in a subject
                      // Backend already returns them in chronological order, but ensure consistency
                      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
                      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
                      return bTime - aTime
                    }) as Memory[]}
                    onCopy={handleCopy}
                    onDelete={handleDeleteMemory}
                    onShowMemories={handleShowRelatedMemories}
                  />
                  {/* Load more pairs button */}
                  {hasMorePairs && (
                    <div className="flex justify-center p-4 border-t border-border">
                      <button
                        type="button"
                        onClick={handleLoadMorePairs}
                        disabled={isLoadingMorePairs}
                        className="px-6 py-2 rounded-md text-sm font-medium text-primary border border-primary/30 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoadingMorePairs ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            Loading older memories...
                          </span>
                        ) : (
                          "Load More"
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Show when no more pairs available */}
                  {!hasMorePairs && pairs.length > 0 && (
                    <div className="flex justify-center p-4 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        No more memories to load
                      </span>
                    </div>
                  )}
                </div>
              )}
              {!pairsLoading && pairs.length === 0 && !pairsError && (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Info size={24} />
                  </div>
                  <p className="text-center">
                    No memory pairs found for this subject.
                  </p>
                </div>
              )}
              {pairsLoading && (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-lg">Loading recent memories...</p>
                  <p className="text-sm text-muted-foreground/70">
                    Fetching memories chronologically (newest first)
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Original search bar and memory list/network
          <>
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
          </>
        )}
      </div>
    </Modal>
  )
}
