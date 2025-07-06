import { useCallback, useEffect } from "react"
import { List, Network, Info, X as LucideX } from "lucide-react"
import { Memory } from "@/api/getMemories"
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import MemoriesNetworkGraph from "@/screens/MemoriesDashboard/MemoriesNetworkGraph"
import MemoriesListView from "@/screens/MemoriesDashboard/MemoriesListView"
import SearchBar from "@/screens/MemoriesDashboard/SearchBar"
import SubjectSelector from "./SubjectSelector"
import SelectedSubjectBar from "./SelectedSubjectBar"
import PairSearchSection from "./PairSearchSection"
import { formatCount } from "./utils"
import {
  useDashboardState,
  useMemorySearch,
  useSubjectManagement,
  usePairManagement,
  useSubjectEditing,
  useMemoryUtils,
} from "./hooks"

export default function MemoriesDashboardOverlay() {
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { showMemoryNetwork } = useMemoryNetwork()

  // Use custom hooks for state management and business logic
  const { state, dispatch, user, preferences, memoryCount, searchInputRef } =
    useDashboardState()

  const { handleSearch } = useMemorySearch(
    dispatch,
    user,
    preferences,
    searchInputRef
  )

  const {
    handleShowMoreSubjects,
    handleResetSubjectSearch,
    handleSubjectUpdated,
  } = useSubjectManagement(dispatch, user, state)

  const handleClearSearch = useCallback(() => {
    // Clear search state
    dispatch({ type: "SET_MEMORIES", payload: [] })
    dispatch({ type: "SET_ERROR", payload: null })
    dispatch({ type: "SET_LAST_SEARCHED_TERM", payload: "" })
    
    // Reset subjects to all subjects
    handleResetSubjectSearch()
  }, [dispatch, handleResetSubjectSearch])

  const { loadRecentPairs, handleLoadMorePairs, handlePairSearch } =
    usePairManagement(dispatch, user, state)

  const {
    startEditingSelectedSubject,
    cancelEditingSelectedSubject,
    saveEditSelectedSubject,
    handleKeyPress,
  } = useSubjectEditing(dispatch, user, state, handleSubjectUpdated)

  const { getListViewMemories } = useMemoryUtils(state.memories)

  // Destructure state for easier access
  const {
    memories,
    loading,
    error,
    lastSearchedTerm,
    activeView,
    subjectsCollapsed,
    subjects,
    subjectsLoading,
    subjectsError,
    selectedSubject,
    hasMoreSubjects,
    showMoreLoading,
    isSubjectSearchMode,
    pairs,
    pairsLoading,
    pairsError,
    hasMorePairs,
    isLoadingMorePairs,
    editingSelectedSubject,
    editingText,
    savingEdit,
  } = state

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
          const removeMemory = (mems: Memory[]): Memory[] =>
            mems.filter((mem) => {
              if (mem.id === memory.id) return false
              if (mem.children && mem.children.length > 0)
                mem.children = removeMemory(mem.children)
              return true
            })
          dispatch({
            type: "SET_MEMORIES",
            payload: removeMemory([...memories]),
          })
          toast.success("Memory deleted successfully")
        },
      })
    },
    [confirmMemoryDeletion, memories, dispatch]
  )

  const handleShowRelatedMemories = useCallback(
    (memory: Memory) => {
      showMemoryNetwork(memory) // This will open the MemoryNetworkModal
    },
    [showMemoryNetwork]
  )

  // Collapse subject list when rendering memory search results
  useEffect(() => {
    // Only collapse if we are showing pairs for a selected subject, not for general memory search
    if (selectedSubject && pairs.length > 0) {
      dispatch({ type: "SET_SUBJECTS_COLLAPSED", payload: true })
    }
  }, [selectedSubject, pairs.length, dispatch])

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
              onClick={() =>
                dispatch({
                  type: "SET_SUBJECTS_COLLAPSED",
                  payload: !subjectsCollapsed,
                })
              }
            >
              {subjectsCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
          {subjectsCollapsed && selectedSubject ? (
            <SelectedSubjectBar
              selectedSubject={selectedSubject}
              editingSelectedSubject={editingSelectedSubject}
              editingText={editingText}
              savingEdit={savingEdit}
              onEditingTextChange={(text) =>
                dispatch({ type: "SET_EDITING_TEXT", payload: text })
              }
              onKeyPress={handleKeyPress}
              onStartEditing={startEditingSelectedSubject}
              onSaveEdit={saveEditSelectedSubject}
              onCancelEdit={cancelEditingSelectedSubject}
              onClearSubject={() =>
                dispatch({ type: "SET_SELECTED_SUBJECT", payload: null })
              }
            />
          ) : !subjectsCollapsed ? (
            <SubjectSelector
              subjects={subjects}
              loading={subjectsLoading}
              error={subjectsError}
              selectedSubjectId={selectedSubject?.id || null}
              userID={user?.uid}
              onSubjectUpdated={handleSubjectUpdated}
              onSelect={(subject) => {
                dispatch({
                  type: "SELECT_SUBJECT_AND_RESET_PAIRS",
                  payload: { subject },
                })
                // Automatically load recent pairs for this subject
                loadRecentPairs(subject)
              }}
              onShowMore={handleShowMoreSubjects}
              hasMore={hasMoreSubjects}
              showMoreLoading={showMoreLoading}
              isSearchMode={isSubjectSearchMode}
              onResetSearch={handleResetSubjectSearch}
              searchQuery={lastSearchedTerm}
            />
          ) : null}
        </div>
        {/* If a subject is selected, show pair search and results */}
        {selectedSubject ? (
          <PairSearchSection
            selectedSubject={selectedSubject}
            pairs={pairs}
            pairsLoading={pairsLoading}
            pairsError={pairsError}
            hasMorePairs={hasMorePairs}
            isLoadingMorePairs={isLoadingMorePairs}
            onPairSearch={handlePairSearch}
            onLoadMorePairs={handleLoadMorePairs}
            onCopy={handleCopy}
            onDelete={handleDeleteMemory}
            onShowMemories={handleShowRelatedMemories}
          />
        ) : (
          // Original search bar and memory list/network
          <>
            <div className="flex flex-col gap-4 pb-4 border-b border-border mb-4">
              <SearchBar
                onSearch={handleSearch}
                inputRef={searchInputRef}
                loading={loading}
                currentQuery={lastSearchedTerm}
                onClear={handleClearSearch}
              />
              <div className="flex justify-between items-center w-full">
                <div className="flex gap-3">
                  <Button
                    variant={activeView === "list" ? "default" : "outline"}
                    onClick={() =>
                      dispatch({ type: "SET_ACTIVE_VIEW", payload: "list" })
                    }
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
                    onClick={() =>
                      dispatch({ type: "SET_ACTIVE_VIEW", payload: "network" })
                    }
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
                  <span className="text-foreground/80 font-medium">
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
              {!loading &&
                !error &&
                memories.length === 0 &&
                lastSearchedTerm && (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-muted-foreground text-lg text-center gap-3">
                    <Info size={24} />
                    <p>
                      No memories found for &quot;{lastSearchedTerm}&quot;. Try
                      a different search.
                    </p>
                  </div>
                )}
              {!loading &&
                !error &&
                memories.length === 0 &&
                !lastSearchedTerm && (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-muted-foreground text-lg text-center gap-3">
                    <Info size={24} />
                    <p>
                      Enter a search term and click Search to find your
                      memories.
                    </p>
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
