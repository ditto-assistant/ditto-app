import { z } from "zod"

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

export const SubjectSchema = z.object({
  id: z.string(),
  subject_text: z.string(),
  description: z.string().optional(),
  is_key_subject: z.boolean().optional(),
  similarity: z.number().optional(),
  pair_count: z.number().optional(),
})

export type Subject = z.infer<typeof SubjectSchema>

export const SubjectSearchResultSchema = z.object({
  results: z.array(SubjectSchema),
  metadata: z.object({
    query: z.string(),
    top_k: z.number(),
    min_similarity: z.number(),
  }),
})

export type SubjectSearchResult = z.infer<typeof SubjectSearchResultSchema>

export const PairSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  prompt: z.string().optional(),
  response: z.string().optional(),
  similarity: z.number().optional(),
  score: z.number().optional(),
  vector_distance: z.number().optional(),
  depth: z.number().optional(),
  timestamp: z.coerce.date().optional(),
  timestamp_formatted: z.string().optional(),
})

export type Pair = z.infer<typeof PairSchema>

export const PairSearchResultSchema = z.object({
  results: z.array(PairSchema),
  metadata: z.object({
    limit: z.number(),
    offset: z.number(),
    subject_id: z.string().optional(),
    subject_text: z.string().optional(),
    total_found: z.number(),
  }),
})

export type PairSearchResult = z.infer<typeof PairSearchResultSchema>
