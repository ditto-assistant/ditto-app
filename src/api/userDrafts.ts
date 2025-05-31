import { z } from "zod"
import { getToken } from "./auth"
import { BASE_URL } from "../firebaseConfig"

// Response schemas
export const UserDraftResponseSchema = z.object({
  prompt: z.string(),
  image: z.string(),
})
export type UserDraftResponse = z.infer<typeof UserDraftResponseSchema>

// Request schemas
export const UserDraftRequestSchema = z.object({
  prompt: z.string(),
  image: z.string().optional(),
})
export type UserDraftRequest = z.infer<typeof UserDraftRequestSchema>

/**
 * Save a prompt draft for the user
 */
export async function savePromptDraft(
  userID: string,
  prompt: string,
  image?: string
): Promise<void | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(`${BASE_URL}/api/v2/users/${userID}/drafts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({ prompt, image: image || "" }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to save draft: HTTP ${response.status} - ${errorText}`
      )
    }

    return
  } catch (error) {
    console.error("Error saving draft:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

/**
 * Get the user's saved prompt draft
 */
export async function getPromptDraft(
  userID: string
): Promise<UserDraftResponse | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(`${BASE_URL}/api/v2/users/${userID}/drafts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tok.ok.token}`,
      },
    })

    if (response.status === 404) {
      return new Error("No draft found")
    }

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to get draft: HTTP ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()
    const validatedData = UserDraftResponseSchema.safeParse(data)
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error)
      return new Error("Invalid response from server")
    }

    return validatedData.data
  } catch (error) {
    console.error("Error getting draft:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

/**
 * Clear the user's saved prompt draft
 */
export async function clearPromptDraft(userID: string): Promise<void | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(`${BASE_URL}/api/v2/users/${userID}/drafts`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tok.ok.token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to clear draft: HTTP ${response.status} - ${errorText}`
      )
    }

    return
  } catch (error) {
    console.error("Error clearing draft:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}
