import { z } from "zod"
import { Result } from "@/types/common"
import { routes } from "../firebaseConfig"
import { getToken } from "./auth"

// Response schemas
export const SubjectWithCountSchema = z.object({
  subject_text: z.string(),
  pair_count: z.number(),
})
export type SubjectWithCount = z.infer<typeof SubjectWithCountSchema>

export const SubjectsForPairsResponseSchema = z.record(
  z.string(),
  z.array(SubjectWithCountSchema)
)
export type SubjectsForPairsResponse = z.infer<
  typeof SubjectsForPairsResponseSchema
>

// Request schemas
export const GetSubjectsForPairsRequestSchema = z.object({
  pair_ids: z.array(z.string()),
})
export type GetSubjectsForPairsRequest = z.infer<
  typeof GetSubjectsForPairsRequestSchema
>

export async function getSubjectsForPairs(
  pairIDs: string[]
): Promise<Result<Map<string, SubjectWithCount[]>>> {
  if (pairIDs.length === 0) {
    return { ok: new Map() }
  }

  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    // Validate request data
    const requestBody: GetSubjectsForPairsRequest = { pair_ids: pairIDs }
    const validatedRequest =
      GetSubjectsForPairsRequestSchema.safeParse(requestBody)
    if (!validatedRequest.success) {
      console.error(
        "Request validation error:",
        validatedRequest.error.flatten()
      )
      return { err: `Invalid request data: ${validatedRequest.error.message}` }
    }

    const response = await fetch(routes.pairSubjects, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(validatedRequest.data),
    })

    if (response.ok) {
      const rawData: unknown = await response.json()
      const validatedResponse =
        SubjectsForPairsResponseSchema.safeParse(rawData)
      if (!validatedResponse.success) {
        console.error(
          "Response validation error:",
          validatedResponse.error.flatten()
        )
        return {
          err: `Invalid response data: ${validatedResponse.error.message}`,
        }
      }

      return { ok: new Map(Object.entries(validatedResponse.data)) }
    } else {
      return {
        err: `Failed to get subjects for pairs. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Failed to get subjects for pairs. Error: ${error}` }
  }
}
