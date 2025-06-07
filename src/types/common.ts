export type Result<T> = {
  ok?: T
  err?: string
}

export type FetchHook<T> = Result<T> & {
  loading: boolean
  refetch: () => void
}

// Add UpdateServiceState to common types
export interface UpdateServiceState {
  status:
    | "idle"
    | "update-available"
    | "update-ready"
    | "update-error"
    | "outdated"
  updateVersion?: string
  currentVersion: string
  lastCheckedVersion?: string
  needsRefresh: boolean
  justUpdated: boolean
}

// Add WhatsNew related types
export interface WhatsNewFeature {
  type: "new" | "improved" | "fixed"
  title: string
  description: string
}

export interface WhatsNewSection {
  title: string
  features: WhatsNewFeature[]
}

// Add window interfaces
declare global {
  interface Window {
    __updateSW?: (reloadPage?: boolean) => void
    lazyLoadErrorHandler?: (error: Error) => boolean
  }
}

// Subject and Pair types for KG endpoints
export interface Subject {
  id: string
  subject_text: string
  description?: string
  is_key_subject?: boolean
  similarity?: number
  pair_count?: number
}

export interface SubjectSearchResult {
  results: Subject[]
  metadata: {
    query: string
    top_k: number
    min_similarity: number
  }
}

export interface Pair {
  id: string
  title?: string
  summary?: string
  prompt?: string
  response?: string
  similarity?: number
  score?: number
  vector_distance?: number
  depth?: number
  timestamp?: string | number | Date
  timestamp_formatted?: string
}

export interface PairSearchResult {
  results: Pair[]
  metadata: {
    query: string
    top_k: number
    subject_id?: string
    subject_text?: string
  }
}
