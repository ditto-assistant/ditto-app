import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
} from "react"
import { List, Network, Info, X as LucideX, Edit2 } from "lucide-react"
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
import {
  searchSubjects,
  getSubjectPairs,
  getTopSubjects,
  getSubjectPairsRecent,
  renameSubject,
} from "@/api/kg"
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
const deduplicateSubjects = (
  existingSubjects: Subject[],
  newSubjects: Subject[]
): Subject[] => {
  const existingIds = new Set(existingSubjects.map((s) => s.id))
  const uniqueNewSubjects = newSubjects.filter((s) => !existingIds.has(s.id))
  return [...existingSubjects, ...uniqueNewSubjects]
}

// Utility function to deduplicate pairs by ID
const deduplicatePairs = (existingPairs: Pair[], newPairs: Pair[]): Pair[] => {
  const existingIds = new Set(existingPairs.map((p) => p.id))
  const uniqueNewPairs = newPairs.filter((p) => !existingIds.has(p.id))
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

// Reducer state interface
interface DashboardState {
  // Memory state
  memories: Memory[]
  loading: boolean
  error: string | null
  lastSearchedTerm: string

  // UI state
  activeView: "list" | "network"
  subjectsCollapsed: boolean

  // Subject state
  subjects: Subject[]
  subjectsLoading: boolean
  subjectsError: string | null
  selectedSubject: Subject | null
  subjectsOffset: number
  hasMoreSubjects: boolean
  showMoreLoading: boolean
  isSubjectSearchMode: boolean
  lastSubjectSearch: string

  // Pairs state
  pairs: Pair[]
  pairsLoading: boolean
  pairsError: string | null
  pairsOffset: number
  hasMorePairs: boolean
  isLoadingMorePairs: boolean

  // Subject editing state
  editingSelectedSubject: boolean
  editingText: string
  savingEdit: boolean
}

// Reducer action types
type DashboardAction =
  | { type: "SET_MEMORIES"; payload: Memory[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LAST_SEARCHED_TERM"; payload: string }
  | { type: "SET_ACTIVE_VIEW"; payload: "list" | "network" }
  | { type: "SET_SUBJECTS_COLLAPSED"; payload: boolean }
  | { type: "SET_SUBJECTS"; payload: Subject[] }
  | { type: "SET_SUBJECTS_LOADING"; payload: boolean }
  | { type: "SET_SUBJECTS_ERROR"; payload: string | null }
  | { type: "SET_SELECTED_SUBJECT"; payload: Subject | null }
  | { type: "SET_SUBJECTS_OFFSET"; payload: number }
  | { type: "SET_HAS_MORE_SUBJECTS"; payload: boolean }
  | { type: "SET_SHOW_MORE_LOADING"; payload: boolean }
  | { type: "SET_IS_SUBJECT_SEARCH_MODE"; payload: boolean }
  | { type: "SET_LAST_SUBJECT_SEARCH"; payload: string }
  | { type: "SET_PAIRS"; payload: Pair[] }
  | { type: "SET_PAIRS_LOADING"; payload: boolean }
  | { type: "SET_PAIRS_ERROR"; payload: string | null }
  | { type: "SET_PAIRS_OFFSET"; payload: number }
  | { type: "SET_HAS_MORE_PAIRS"; payload: boolean }
  | { type: "SET_IS_LOADING_MORE_PAIRS"; payload: boolean }
  | { type: "SET_EDITING_SELECTED_SUBJECT"; payload: boolean }
  | { type: "SET_EDITING_TEXT"; payload: string }
  | { type: "SET_SAVING_EDIT"; payload: boolean }
  | { type: "UPDATE_SUBJECT"; payload: Subject }
  | { type: "APPEND_SUBJECTS"; payload: Subject[] }
  | { type: "APPEND_PAIRS"; payload: Pair[] }
  | { type: "RESET_PAIRS" }
  | { type: "RESET_SUBJECTS_TO_TOP" }
  // Consolidated action types for efficient state updates
  | { type: "INIT_MEMORY_SEARCH"; payload: { searchTerm: string } }
  | { type: "INIT_SUBJECTS_FETCH" }
  | {
      type: "COMPLETE_SUBJECTS_FETCH"
      payload: { subjects: Subject[]; hasMore: boolean; isSearchMode?: boolean }
    }
  | { type: "FAIL_SUBJECTS_FETCH"; payload: { error: string } }
  | { type: "INIT_SUBJECT_SEARCH"; payload: { query: string } }
  | { type: "COMPLETE_SUBJECT_SEARCH"; payload: { subjects: Subject[] } }
  | { type: "INIT_PAIRS_FETCH"; payload: { isLoadMore?: boolean } }
  | {
      type: "COMPLETE_PAIRS_FETCH"
      payload: {
        pairs: Pair[]
        hasMore: boolean
        offset: number
        append?: boolean
      }
    }
  | {
      type: "FAIL_PAIRS_FETCH"
      payload: { error: string; isLoadMore?: boolean }
    }
  | { type: "SELECT_SUBJECT_AND_RESET_PAIRS"; payload: { subject: Subject } }
  | { type: "START_EDITING_SUBJECT" }
  | { type: "FINISH_EDITING_SUBJECT" }
  | {
      type: "LOAD_MORE_SUBJECTS_COMPLETE"
      payload: { newResults: Subject[]; newOffset: number }
    }

// Initial state
const initialState: DashboardState = {
  memories: [],
  loading: false,
  error: null,
  lastSearchedTerm: "",
  activeView: "list",
  subjectsCollapsed: false,
  subjects: [],
  subjectsLoading: false,
  subjectsError: null,
  selectedSubject: null,
  subjectsOffset: 0,
  hasMoreSubjects: true,
  showMoreLoading: false,
  isSubjectSearchMode: false,
  lastSubjectSearch: "",
  pairs: [],
  pairsLoading: false,
  pairsError: null,
  pairsOffset: 0,
  hasMorePairs: true,
  isLoadingMorePairs: false,
  editingSelectedSubject: false,
  editingText: "",
  savingEdit: false,
}

// Reducer function
const dashboardReducer = (
  state: DashboardState,
  action: DashboardAction
): DashboardState => {
  switch (action.type) {
    case "SET_MEMORIES":
      return { ...state, memories: action.payload }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "SET_LAST_SEARCHED_TERM":
      return { ...state, lastSearchedTerm: action.payload }
    case "SET_ACTIVE_VIEW":
      return { ...state, activeView: action.payload }
    case "SET_SUBJECTS_COLLAPSED":
      return { ...state, subjectsCollapsed: action.payload }
    case "SET_SUBJECTS":
      return { ...state, subjects: action.payload }
    case "SET_SUBJECTS_LOADING":
      return { ...state, subjectsLoading: action.payload }
    case "SET_SUBJECTS_ERROR":
      return { ...state, subjectsError: action.payload }
    case "SET_SELECTED_SUBJECT":
      return { ...state, selectedSubject: action.payload }
    case "SET_SUBJECTS_OFFSET":
      return { ...state, subjectsOffset: action.payload }
    case "SET_HAS_MORE_SUBJECTS":
      return { ...state, hasMoreSubjects: action.payload }
    case "SET_SHOW_MORE_LOADING":
      return { ...state, showMoreLoading: action.payload }
    case "SET_IS_SUBJECT_SEARCH_MODE":
      return { ...state, isSubjectSearchMode: action.payload }
    case "SET_LAST_SUBJECT_SEARCH":
      return { ...state, lastSubjectSearch: action.payload }
    case "SET_PAIRS":
      return { ...state, pairs: action.payload }
    case "SET_PAIRS_LOADING":
      return { ...state, pairsLoading: action.payload }
    case "SET_PAIRS_ERROR":
      return { ...state, pairsError: action.payload }
    case "SET_PAIRS_OFFSET":
      return { ...state, pairsOffset: action.payload }
    case "SET_HAS_MORE_PAIRS":
      return { ...state, hasMorePairs: action.payload }
    case "SET_IS_LOADING_MORE_PAIRS":
      return { ...state, isLoadingMorePairs: action.payload }
    case "SET_EDITING_SELECTED_SUBJECT":
      return { ...state, editingSelectedSubject: action.payload }
    case "SET_EDITING_TEXT":
      return { ...state, editingText: action.payload }
    case "SET_SAVING_EDIT":
      return { ...state, savingEdit: action.payload }
    case "UPDATE_SUBJECT":
      return {
        ...state,
        subjects: state.subjects.map((subject) =>
          subject.id === action.payload.id ? action.payload : subject
        ),
        selectedSubject:
          state.selectedSubject?.id === action.payload.id
            ? action.payload
            : state.selectedSubject,
      }
    case "APPEND_SUBJECTS":
      return {
        ...state,
        subjects: deduplicateSubjects(state.subjects, action.payload),
      }
    case "APPEND_PAIRS":
      return {
        ...state,
        pairs: deduplicatePairs(state.pairs, action.payload),
      }
    case "RESET_PAIRS":
      return {
        ...state,
        pairs: [],
        pairsError: null,
        pairsOffset: 0,
        hasMorePairs: true,
      }
    case "RESET_SUBJECTS_TO_TOP":
      return {
        ...state,
        subjectsOffset: 0,
        hasMoreSubjects: true,
        isSubjectSearchMode: false,
        lastSubjectSearch: "",
      }
    // Consolidated action handlers for efficient state updates
    case "INIT_MEMORY_SEARCH":
      return {
        ...state,
        loading: true,
        error: null,
        memories: [],
        lastSearchedTerm: action.payload.searchTerm,
      }
    case "INIT_SUBJECTS_FETCH":
      return {
        ...state,
        subjectsLoading: true,
        subjectsError: null,
        subjectsOffset: 0,
      }
    case "COMPLETE_SUBJECTS_FETCH":
      return {
        ...state,
        subjectsLoading: false,
        subjects: action.payload.subjects,
        hasMoreSubjects: action.payload.hasMore,
        isSubjectSearchMode: action.payload.isSearchMode ?? false,
      }
    case "FAIL_SUBJECTS_FETCH":
      return {
        ...state,
        subjectsLoading: false,
        subjectsError: action.payload.error,
        subjects: [],
        hasMoreSubjects: false,
      }
    case "INIT_SUBJECT_SEARCH":
      return {
        ...state,
        subjectsLoading: true,
        subjectsError: null,
        lastSubjectSearch: action.payload.query,
        isSubjectSearchMode: true,
        hasMoreSubjects: false,
      }
    case "COMPLETE_SUBJECT_SEARCH":
      return {
        ...state,
        subjectsLoading: false,
        subjects: action.payload.subjects,
      }
    case "INIT_PAIRS_FETCH":
      return {
        ...state,
        pairsLoading: !action.payload.isLoadMore,
        isLoadingMorePairs: action.payload.isLoadMore ?? false,
        pairsError: null,
        ...(action.payload.isLoadMore ? {} : { pairsOffset: 0 }),
      }
    case "COMPLETE_PAIRS_FETCH":
      return {
        ...state,
        pairsLoading: false,
        isLoadingMorePairs: false,
        pairs: action.payload.append
          ? deduplicatePairs(state.pairs, action.payload.pairs)
          : action.payload.pairs,
        hasMorePairs: action.payload.hasMore,
        pairsOffset: action.payload.offset,
      }
    case "FAIL_PAIRS_FETCH":
      return {
        ...state,
        pairsLoading: !action.payload.isLoadMore,
        isLoadingMorePairs: false,
        pairsError: action.payload.error,
        ...(action.payload.isLoadMore ? {} : { pairs: [] }),
      }
    case "SELECT_SUBJECT_AND_RESET_PAIRS":
      return {
        ...state,
        selectedSubject: action.payload.subject,
        pairs: [],
        pairsError: null,
        pairsOffset: 0,
        hasMorePairs: true,
      }
    case "START_EDITING_SUBJECT":
      return {
        ...state,
        editingSelectedSubject: true,
        editingText: state.selectedSubject?.subject_text ?? "",
      }
    case "FINISH_EDITING_SUBJECT":
      return {
        ...state,
        editingSelectedSubject: false,
        editingText: "",
        savingEdit: false,
      }
    case "LOAD_MORE_SUBJECTS_COMPLETE":
      return {
        ...state,
        subjects: deduplicateSubjects(
          state.subjects,
          action.payload.newResults
        ),
        subjectsOffset: action.payload.newOffset,
        hasMoreSubjects: action.payload.newResults.length === 10,
      }
    default:
      return state
  }
}

export default function MemoriesDashboardOverlay() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)
  const { user } = useAuth()
  const { preferences } = useModelPreferences()
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { showMemoryNetwork } = useMemoryNetwork()
  const [memoryCount, setMemoryCount] = useState<number>(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
    subjectsOffset,
    hasMoreSubjects,
    showMoreLoading,
    isSubjectSearchMode,
    lastSubjectSearch,
    pairs,
    pairsLoading,
    pairsError,
    pairsOffset,
    hasMorePairs,
    isLoadingMorePairs,
    editingSelectedSubject,
    editingText,
    savingEdit,
  } = state

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

  const handleSearch = async () => {
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
    [confirmMemoryDeletion, memories]
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
  }

  // Show more subjects handler
  const handleShowMoreSubjects = async () => {
    if (!user?.uid || showMoreLoading) return
    dispatch({ type: "SET_SHOW_MORE_LOADING", payload: true })
    try {
      const newOffset = subjectsOffset + 10
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
  }

  // Reset subject search handler
  const handleResetSubjectSearch = async () => {
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
  }

  // Load recent pairs for selected subject
  const loadRecentPairs = async (
    subject: Subject,
    offset: number = 0,
    append: boolean = false
  ) => {
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
    dispatch({ type: "INIT_PAIRS_FETCH", payload: { isLoadMore: false } })

    try {
      const res = await getSubjectPairs({
        userID: user.uid,
        subjectID: selectedSubject.id,
        subjectText: selectedSubject.subject_text,
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
  }

  // Collapse subject list when rendering memory search results
  useEffect(() => {
    // Collapse if we are showing memory search results (pairs for a subject or general memory results)
    if (
      (selectedSubject && pairs.length > 0) ||
      (!selectedSubject && memories.length > 0)
    ) {
      dispatch({ type: "SET_SUBJECTS_COLLAPSED", payload: true })
    }
  }, [selectedSubject, pairs.length, memories.length])

  // Handle subject updates from SubjectSelector
  const handleSubjectUpdated = useCallback((updatedSubject: Subject) => {
    dispatch({ type: "UPDATE_SUBJECT", payload: updatedSubject })
  }, [])

  // Start editing selected subject
  const startEditingSelectedSubject = () => {
    if (selectedSubject) {
      dispatch({ type: "START_EDITING_SUBJECT" })
    }
  }

  // Cancel editing selected subject
  const cancelEditingSelectedSubject = () => {
    dispatch({ type: "FINISH_EDITING_SUBJECT" })
  }

  // Save edited selected subject
  const saveEditSelectedSubject = async () => {
    if (!selectedSubject || !editingText.trim() || !user?.uid) return

    dispatch({ type: "SET_SAVING_EDIT", payload: true })
    try {
      const result = await renameSubject({
        userID: user.uid,
        subjectId: selectedSubject.id,
        newSubjectText: editingText.trim(),
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
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEditSelectedSubject()
    } else if (e.key === "Escape") {
      cancelEditingSelectedSubject()
    }
  }

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
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium text-primary">
                  Selected:
                </span>
                {editingSelectedSubject ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_EDITING_TEXT",
                          payload: e.target.value,
                        })
                      }
                      onKeyDown={handleKeyPress}
                      className="text-sm bg-background border border-border rounded px-2 py-1 flex-1 max-w-[200px]"
                      autoFocus
                      disabled={savingEdit}
                    />
                    <button
                      onClick={saveEditSelectedSubject}
                      disabled={savingEdit || !editingText.trim()}
                      className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEditingSelectedSubject}
                      disabled={savingEdit}
                      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-foreground">
                      {selectedSubject.subject_text}
                    </span>
                    {selectedSubject.pair_count && (
                      <span className="text-xs text-muted-foreground">
                        ({selectedSubject.pair_count} pairs)
                      </span>
                    )}
                  </>
                )}
              </div>
              {!editingSelectedSubject && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted transition-colors flex items-center gap-1"
                    onClick={startEditingSelectedSubject}
                    title="Edit subject name"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted transition-colors"
                    onClick={() =>
                      dispatch({ type: "SET_SELECTED_SUBJECT", payload: null })
                    }
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
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
                onSubmit={(e) => {
                  e.preventDefault()
                  const input = e.currentTarget.elements.namedItem(
                    "pairSearch"
                  ) as HTMLInputElement
                  handlePairSearch(input.value)
                }}
                autoComplete="off"
              >
                <input
                  name="pairSearch"
                  type="text"
                  placeholder={`Search memories in '${selectedSubject.subject_text}'...`}
                  className="flex-1 px-3 py-2 rounded border border-input bg-muted text-foreground text-sm focus:outline-none focus:border-primary"
                  disabled={pairsLoading}
                />
                <Button
                  type="submit"
                  disabled={pairsLoading}
                  className="h-10 px-4 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/70 disabled:cursor-not-allowed"
                >
                  {pairsLoading ? "Searching..." : "Search"}
                </Button>
              </form>
              {pairsError && (
                <div className="text-destructive text-sm mt-1">
                  {pairsError}
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {!pairsLoading && pairs.length > 0 && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <MemoriesListView
                    memories={pairs.sort((a, b) => {
                      // Always maintain chronological order (newest first) for pairs in a subject
                      // Backend already returns them in chronological order, but ensure consistency
                      const aTime = a.timestamp
                        ? new Date(a.timestamp).getTime()
                        : 0
                      const bTime = b.timestamp
                        ? new Date(b.timestamp).getTime()
                        : 0
                      return bTime - aTime
                    })}
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
