import { z } from "zod"
import { routes } from "@/firebaseConfig"
import { getToken } from "@/api/auth"
import {
  PairSearchResultSchema,
  PairRecentResultSchema,
  Result,
  SubjectSearchResultSchema,
  SubjectSchema,
  Subject,
  SubjectSearchResult,
  PairSearchResult,
  PairRecentResult,
} from "@/types/common"

/**
 * Sanitizes subject text input to prevent injection attacks
 * @param text - The subject text to sanitize
 * @returns Sanitized subject text
 */
function sanitizeSubjectText(text: string): string {
  return text
    .trim() // Remove leading/trailing whitespace
    .slice(0, 200) // Limit to 200 characters
    .replace(/[<>]/g, "") // Remove potential HTML/XML tags
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
}

/**
 * Validates that sanitized subject text is not empty
 * @param text - The sanitized subject text
 * @returns true if valid, false otherwise
 */
function isValidSubjectText(text: string): boolean {
  return text.length > 0 && text.length <= 200
}

/**
 * Converts Zod validation errors to user-friendly messages
 * @param errorData - The flattened Zod error data
 * @returns A readable error message
 */
function formatValidationError(errorData: {
  formErrors?: string[]
  fieldErrors?: Record<string, string[] | undefined>
}): string {
  const { formErrors, fieldErrors } = errorData

  const messages: string[] = []

  if (formErrors && formErrors.length > 0) {
    messages.push(...formErrors)
  }

  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (Array.isArray(errors) && errors.length > 0) {
        messages.push(`${field}: ${errors.join(", ")}`)
      }
    }
  }

  return messages.length > 0
    ? messages.join("; ")
    : "Invalid data format received from server"
}

export const RenameSubjectResponseSchema = z.object({
  success: z.boolean(),
  subject: SubjectSchema,
  message: z.string(),
})
export type RenameSubjectResponse = z.infer<typeof RenameSubjectResponseSchema>

export const GetTopSubjectsResponseSchema = z.object({
  results: z.array(SubjectSchema),
  metadata: z.object({
    limit: z.number(),
    offset: z.number(),
  }),
})
export type GetTopSubjectsResponse = z.infer<
  typeof GetTopSubjectsResponseSchema
>

export const GetTopSubjectsWithPairsResponseSchema = z.object({
  results: z.array(
    SubjectSchema.extend({
      recent_pairs: z.array(
        z.object({
          id: z.string(),
          prompt: z.string(),
          response: z.string(),
          timestamp: z.coerce.date().optional(), // Use coerce to handle string timestamps
          title: z.string().optional(),
          similarity: z.number().optional(),
          score: z.number().optional(),
          vector_distance: z.number().optional(),
          depth: z.number().optional(),
          timestamp_formatted: z.string().optional(),
        })
      ),
    })
  ),
  metadata: z.object({
    limit: z.number(),
    pairs_per_subject: z.number(),
    total_subjects: z.number(),
    total_firestore_ids: z.number(),
  }),
})
export type GetTopSubjectsWithPairsResponse = z.infer<
  typeof GetTopSubjectsWithPairsResponseSchema
>

export async function searchSubjects({
  userID,
  userEmail,
  query,
  topK = 5,
  minSimilarity = 0.1,
}: {
  userID?: string
  userEmail?: string
  query: string
  topK?: number
  minSimilarity?: number
}): Promise<Result<SubjectSearchResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgSubjectsSearch, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        query,
        top_k: topK,
        min_similarity: minSimilarity,
      }),
    })
    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedData = SubjectSearchResultSchema.safeParse(rawData)
      if (!validatedData.success) {
        return {
          err: `searchSubjects: Invalid response data: ${validatedData.error}`,
        }
      }
      return { ok: validatedData.data }
    } else {
      return { err: `Unable to search subjects. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to search subjects. Error: ${error}` }
  }
}

export async function searchPairs({
  userID,
  userEmail,
  query,
  topK = 5,
}: {
  userID?: string
  userEmail?: string
  query: string
  topK?: number
}): Promise<Result<PairSearchResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgPairsSearch, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        query,
        top_k: topK,
      }),
    })
    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedData = PairSearchResultSchema.safeParse(rawData)
      if (!validatedData.success) {
        return {
          err: `searchPairs: Invalid response data: ${validatedData.error.flatten()}`,
        }
      }
      return { ok: validatedData.data }
    } else {
      return { err: `Unable to search pairs. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to search pairs. Error: ${error}` }
  }
}

export async function getSubjectPairs({
  userID,
  userEmail,
  subjectID,
  subjectText,
  query,
  topK = 5,
}: {
  userID?: string
  userEmail?: string
  subjectID?: string
  subjectText?: string
  query: string
  topK?: number
}): Promise<Result<PairSearchResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgSubjectPairs, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        subject_id: subjectID,
        subject_text: subjectText,
        query,
        top_k: topK,
      }),
    })
    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedData = PairSearchResultSchema.safeParse(rawData)
      if (!validatedData.success) {
        const errorMessage = formatValidationError(
          validatedData.error.flatten()
        )
        return {
          err: `Unable to load subject pairs. Server response error: ${errorMessage}`,
        }
      }
      return { ok: validatedData.data }
    } else {
      return { err: `Unable to get subject pairs. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to get subject pairs. Error: ${error}` }
  }
}

export async function getTopSubjectsWithPairs({
  userID,
  userEmail,
  limit = 10,
  pairsPerSubject = 3,
}: {
  userID?: string
  userEmail?: string
  limit?: number
  pairsPerSubject?: number
}): Promise<Result<GetTopSubjectsWithPairsResponse>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgTopSubjectsWithPairs, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        limit,
        pairs_per_subject: pairsPerSubject,
      }),
    })
    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedResponse =
        GetTopSubjectsWithPairsResponseSchema.safeParse(rawData)
      if (!validatedResponse.success) {
        return {
          err: `getTopSubjectsWithPairs: Invalid response data: ${validatedResponse.error.flatten()}`,
        }
      }
      return { ok: validatedResponse.data }
    } else {
      return {
        err: `Unable to get top subjects with pairs. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Unable to get top subjects with pairs. Error: ${error}` }
  }
}

export async function getTopSubjects({
  userID,
  userEmail,
  limit = 5,
  offset = 0,
}: {
  userID?: string
  userEmail?: string
  limit?: number
  offset?: number
}): Promise<
  Result<{ results: Subject[]; metadata: { limit: number; offset: number } }>
> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgTopSubjects, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        limit,
        offset,
      }),
    })
    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedResponse = GetTopSubjectsResponseSchema.safeParse(rawData)
      if (!validatedResponse.success) {
        return {
          err: `getTopSubjects: Invalid response data: ${validatedResponse.error.flatten()}`,
        }
      }
      return { ok: validatedResponse.data }
    } else {
      return { err: `Unable to get top subjects. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to get top subjects. Error: ${error}` }
  }
}

export async function getSubjectPairsRecent({
  userID,
  userEmail,
  subjectID,
  subjectText,
  limit = 5,
  offset = 0,
}: {
  userID?: string
  userEmail?: string
  subjectID?: string
  subjectText?: string
  limit?: number
  offset?: number
}): Promise<Result<PairRecentResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgSubjectPairsRecent, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        subject_id: subjectID,
        subject_text: subjectText,
        limit,
        offset,
      }),
    })
    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedData = PairRecentResultSchema.safeParse(rawData)
      if (!validatedData.success) {
        return {
          err: `getSubjectPairsRecent: Invalid response data: ${JSON.stringify(validatedData.error.flatten())}`,
        }
      }
      return { ok: validatedData.data }
    } else {
      return {
        err: `Unable to get recent subject pairs. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Unable to get recent subject pairs. Error: ${error}` }
  }
}

export async function renameSubject({
  userID,
  userEmail,
  subjectId,
  newSubjectText,
}: {
  userID?: string
  userEmail?: string
  subjectId: string
  newSubjectText: string
}): Promise<Result<RenameSubjectResponse>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  // Sanitize the input text
  const sanitizedText = sanitizeSubjectText(newSubjectText)

  // Validate the sanitized text
  if (!isValidSubjectText(sanitizedText)) {
    return {
      err: "Invalid subject text: must be between 1 and 200 characters after sanitization",
    }
  }

  try {
    const response = await fetch(routes.kgRenameSubject(subjectId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        new_subject_text: sanitizedText,
      }),
    })
    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedResponse = RenameSubjectResponseSchema.safeParse(rawData)
      if (!validatedResponse.success) {
        return {
          err: `renameSubject: Invalid response data: ${validatedResponse.error.flatten()}`,
        }
      }
      return { ok: validatedResponse.data }
    } else {
      return {
        err: `Unable to rename subject. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Unable to rename subject. Error: ${error}` }
  }
}

export const PairSubjectSchema = z.object({
  id: z.string(),
  subject_text: z.string(),
  description: z.string().optional(),
  pair_count: z.number(),
  is_key_subject: z.boolean(),
})
export type PairSubject = z.infer<typeof PairSubjectSchema>

export const ComprehensivePairDetailsSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    timestamp: z.string().nullable(),
    timestamp_formatted: z.string(),
    subjects: z.array(PairSubjectSchema),
  })
  .transform((data) => ({
    ...data,
    title: data.title ?? "Memory Pair",
    description: data.description ?? "",
  }))
export type ComprehensivePairDetails = z.infer<
  typeof ComprehensivePairDetailsSchema
>

export const ComprehensivePairDetailsResponseSchema = z.record(
  z.string(),
  ComprehensivePairDetailsSchema
)
export type ComprehensivePairDetailsResponse = z.infer<
  typeof ComprehensivePairDetailsResponseSchema
>

export async function getComprehensivePairDetails({
  pairIDs,
}: {
  pairIDs: string[]
}): Promise<Result<ComprehensivePairDetailsResponse>> {
  if (pairIDs.length === 0) {
    return { ok: {} }
  }

  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.pairDetails, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        pair_ids: pairIDs,
      }),
    })

    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedData =
        ComprehensivePairDetailsResponseSchema.safeParse(rawData)
      if (!validatedData.success) {
        return {
          err: `getComprehensivePairDetails: Invalid response data: ${validatedData.error}`,
        }
      }
      return { ok: validatedData.data }
    } else {
      return {
        err: `Unable to get comprehensive pair details. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Unable to get comprehensive pair details. Error: ${error}` }
  }
}
