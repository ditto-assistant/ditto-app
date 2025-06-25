import { Memory } from "@/api/getMemories"
import type { Subject, Pair } from "@/types/common"

// Reducer state interface
export interface DashboardState {
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
export type DashboardAction =
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
export const initialState: DashboardState = {
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