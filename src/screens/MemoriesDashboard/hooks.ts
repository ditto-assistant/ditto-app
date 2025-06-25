import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { getMemories, Memory } from "@/api/getMemories"
import { embed } from "@/api/embed"
import { getConversationCount } from "@/api/userContent"
import {
  searchSubjects,
  getSubjectPairs,
  getTopSubjects,
  getSubjectPairsRecent,
  renameSubject,
} from "@/api/kg"
import type { Subject, Pair } from "@/types/common"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { flattenMemoriesForList } from "./utils"
import { dashboardReducer } from "./reducer"
import { initialState, DashboardAction } from "./types"

export const useDashboardState = () => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)
  const { user } = useAuth()
  const { preferences } = useModelPreferences()
  const [memoryCount, setMemoryCount] = useState<number>(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch memory count on mount
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
      dispatch({ type: "INIT_SUBJECTS_FETCH" })
      try {
        const res = await getTopSubjects({
          userID: user.uid,
          limit: 10,
          offset: 0,
        })
        if (res.err) throw new Error(res.err)
        const results = res.ok?.results || []
        // Ensure no duplicates in initial results
        const uniqueResults = results.filter(
          (subject, index, self) =>
            index === self.findIndex((s) => s.id === subject.id)
        )
        dispatch({
          type: "COMPLETE_SUBJECTS_FETCH",
          payload: {
            subjects: uniqueResults,
            hasMore: results.length === 10,
            isSearchMode: false,
          },
        })
      } catch (e: any) {
        dispatch({ type: "FAIL_SUBJECTS_FETCH", payload: { error: e.message } })
      }
    }
    fetchTopSubjects()
  }, [user?.uid])

  return {
    state,
    dispatch,
    user,
    preferences,
    memoryCount,
    searchInputRef,
  }
}

export const useMemorySearch = (
  dispatch: React.Dispatch<DashboardAction>,
  user: any,
  preferences: any,
  searchInputRef: React.RefObject<HTMLInputElement | null>
) => {
  const handleSearch = useCallback(async () => {
    const searchTerm = searchInputRef.current?.value ?? ""
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term")
      return
    }
    dispatch({ type: "INIT_MEMORY_SEARCH", payload: { searchTerm } })
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
        dispatch({ type: "SET_MEMORIES", payload: [] })
        throw new Error("No memories found or query failed.")
      }
      const resultsTree = memoriesResponse.ok.longTerm
      dispatch({ type: "SET_MEMORIES", payload: resultsTree })
      if (resultsTree.length === 0)
        dispatch({
          type: "SET_ERROR",
          payload: "No memories found matching your search term.",
        })
    } catch (err) {
      const e = err as Error
      console.error("Error searching memories:", e)
      dispatch({ type: "SET_ERROR", payload: e.message })
      toast.error(`Search failed: ${e.message}`)
      dispatch({ type: "SET_MEMORIES", payload: [] })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [dispatch, user, preferences, searchInputRef])

  return { handleSearch }
}

export const useSubjectManagement = (
  dispatch: React.Dispatch<DashboardAction>,
  user: any,
  state: any
) => {
  // Subject search handler
  const handleSubjectSearch = useCallback(
    async (query: string) => {
      if (!user?.uid) return
      dispatch({ type: "INIT_SUBJECT_SEARCH", payload: { query } })
      try {
        const res = await searchSubjects({ userID: user.uid, query, topK: 10 })
        if (res.err) throw new Error(res.err)
        const searchResults = res.ok?.results || []
        // Ensure no duplicates even in search results
        const uniqueResults = searchResults.filter(
          (subject, index, self) =>
            index === self.findIndex((s) => s.id === subject.id)
        )
        dispatch({
          type: "COMPLETE_SUBJECT_SEARCH",
          payload: { subjects: uniqueResults },
        })
      } catch (e: any) {
        dispatch({ type: "FAIL_SUBJECTS_FETCH", payload: { error: e.message } })
      }
    },
    [dispatch, user]
  )

  // Show more subjects handler
  const handleShowMoreSubjects = useCallback(async () => {
    if (!user?.uid || state.showMoreLoading) return
    dispatch({ type: "SET_SHOW_MORE_LOADING", payload: true })
    try {
      const newOffset = state.subjectsOffset + 10
      const res = await getTopSubjects({
        userID: user.uid,
        limit: 10,
        offset: newOffset,
      })
      if (res.err) throw new Error(res.err)
      const newResults = res.ok?.results || []

      // Deduplicate subjects by ID to prevent duplicates and update state in one action
      dispatch({
        type: "LOAD_MORE_SUBJECTS_COMPLETE",
        payload: { newResults, newOffset },
      })
    } catch (e: any) {
      dispatch({ type: "SET_SUBJECTS_ERROR", payload: e.message })
    } finally {
      dispatch({ type: "SET_SHOW_MORE_LOADING", payload: false })
    }
  }, [dispatch, user, state.showMoreLoading, state.subjectsOffset])

  // Reset subject search handler
  const handleResetSubjectSearch = useCallback(async () => {
    if (!user?.uid) return
    dispatch({ type: "INIT_SUBJECTS_FETCH" })
    dispatch({ type: "RESET_SUBJECTS_TO_TOP" })
    try {
      const res = await getTopSubjects({
        userID: user.uid,
        limit: 10,
        offset: 0,
      })
      if (res.err) throw new Error(res.err)
      const results = res.ok?.results || []
      // Ensure no duplicates when resetting
      const uniqueResults = results.filter(
        (subject, index, self) =>
          index === self.findIndex((s) => s.id === subject.id)
      )
      dispatch({
        type: "COMPLETE_SUBJECTS_FETCH",
        payload: {
          subjects: uniqueResults,
          hasMore: results.length === 10,
          isSearchMode: false,
        },
      })
    } catch (e: any) {
      dispatch({ type: "FAIL_SUBJECTS_FETCH", payload: { error: e.message } })
    }
  }, [dispatch, user])

  // Handle subject updates
  const handleSubjectUpdated = useCallback(
    (updatedSubject: Subject) => {
      dispatch({ type: "UPDATE_SUBJECT", payload: updatedSubject })
    },
    [dispatch]
  )

  return {
    handleSubjectSearch,
    handleShowMoreSubjects,
    handleResetSubjectSearch,
    handleSubjectUpdated,
  }
}

export const usePairManagement = (
  dispatch: React.Dispatch<DashboardAction>,
  user: any,
  state: any
) => {
  // Load recent pairs for selected subject
  const loadRecentPairs = useCallback(
    async (subject: Subject, offset: number = 0, append: boolean = false) => {
      if (!user?.uid) return
      dispatch({ type: "INIT_PAIRS_FETCH", payload: { isLoadMore: append } })

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
        dispatch({
          type: "COMPLETE_PAIRS_FETCH",
          payload: {
            pairs: newPairs,
            hasMore: newPairs.length === 5,
            offset: append ? offset : 0,
            append,
          },
        })
      } catch (e: any) {
        dispatch({
          type: "FAIL_PAIRS_FETCH",
          payload: { error: e.message, isLoadMore: append },
        })
      }
    },
    [dispatch, user]
  )

  // Load more pairs handler
  const handleLoadMorePairs = useCallback(async () => {
    if (!state.selectedSubject || state.isLoadingMorePairs) return
    const newOffset = state.pairsOffset + 5
    await loadRecentPairs(state.selectedSubject, newOffset, true)
  }, [
    loadRecentPairs,
    state.selectedSubject,
    state.isLoadingMorePairs,
    state.pairsOffset,
  ])

  // Pair search within subject
  const handlePairSearch = useCallback(
    async (query: string) => {
      if (!user?.uid || !state.selectedSubject) return
      dispatch({ type: "INIT_PAIRS_FETCH", payload: { isLoadMore: false } })

      try {
        const res = await getSubjectPairs({
          userID: user.uid,
          subjectID: state.selectedSubject.id,
          subjectText: state.selectedSubject.subject_text,
          query,
          topK: 10,
        })

        if (res.err) throw new Error(res.err)

        // Only set pairs if results is an array
        if (Array.isArray(res.ok?.results)) {
          dispatch({
            type: "COMPLETE_PAIRS_FETCH",
            payload: {
              pairs: res.ok.results,
              hasMore: false,
              offset: 0,
              append: false,
            },
          })
        } else {
          dispatch({
            type: "FAIL_PAIRS_FETCH",
            payload: {
              error:
                typeof res.ok?.results === "string"
                  ? res.ok.results
                  : "No results found.",
              isLoadMore: false,
            },
          })
        }
      } catch (e: any) {
        dispatch({
          type: "FAIL_PAIRS_FETCH",
          payload: { error: e.message, isLoadMore: false },
        })
      }
    },
    [dispatch, user, state.selectedSubject]
  )

  return {
    loadRecentPairs,
    handleLoadMorePairs,
    handlePairSearch,
  }
}

export const useSubjectEditing = (
  dispatch: React.Dispatch<DashboardAction>,
  user: any,
  state: any,
  handleSubjectUpdated: (subject: Subject) => void
) => {
  // Start editing selected subject
  const startEditingSelectedSubject = useCallback(() => {
    if (state.selectedSubject) {
      dispatch({ type: "START_EDITING_SUBJECT" })
    }
  }, [dispatch, state.selectedSubject])

  // Cancel editing selected subject
  const cancelEditingSelectedSubject = useCallback(() => {
    dispatch({ type: "FINISH_EDITING_SUBJECT" })
  }, [dispatch])

  // Save edited selected subject
  const saveEditSelectedSubject = useCallback(async () => {
    if (!state.selectedSubject || !state.editingText.trim() || !user?.uid)
      return

    dispatch({ type: "SET_SAVING_EDIT", payload: true })
    try {
      const result = await renameSubject({
        userID: user.uid,
        subjectId: state.selectedSubject.id,
        newSubjectText: state.editingText.trim(),
      })

      if (result.err) {
        toast.error(`Failed to rename subject: ${result.err}`)
        return
      }

      if (result.ok) {
        toast.success("Subject renamed successfully!")

        // Update the subject in both the subjects list and selected subject
        handleSubjectUpdated(result.ok.subject)

        dispatch({ type: "FINISH_EDITING_SUBJECT" })
      }
    } catch (error) {
      toast.error("Failed to rename subject")
      console.error("Error renaming subject:", error)
    } finally {
      dispatch({ type: "SET_SAVING_EDIT", payload: false })
    }
  }, [
    dispatch,
    user,
    state.selectedSubject,
    state.editingText,
    handleSubjectUpdated,
  ])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        saveEditSelectedSubject()
      } else if (e.key === "Escape") {
        cancelEditingSelectedSubject()
      }
    },
    [saveEditSelectedSubject, cancelEditingSelectedSubject]
  )

  return {
    startEditingSelectedSubject,
    cancelEditingSelectedSubject,
    saveEditSelectedSubject,
    handleKeyPress,
  }
}

export const useMemoryUtils = (memories: Memory[]) => {
  const getListViewMemories = useCallback(() => {
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
  }, [memories])

  return { getListViewMemories }
}
