import { DashboardState, DashboardAction } from "./types"
import { deduplicateSubjects, deduplicatePairs } from "./utils"

// Reducer function
export const dashboardReducer = (
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
