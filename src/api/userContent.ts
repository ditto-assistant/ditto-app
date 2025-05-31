import { z } from "zod"
import { getToken } from "./auth"
import { BASE_URL } from "../firebaseConfig"

// Response schemas
export const UploadImageResponseSchema = z.string()
export type UploadImageResponse = z.infer<typeof UploadImageResponseSchema>

export const ConversationCountResponseSchema = z.object({
  count: z.number(),
})
export type ConversationCountResponse = z.infer<
  typeof ConversationCountResponseSchema
>

// Request schemas
export const UploadImageRequestSchema = z.object({
  base64Image: z.string(),
})
export type UploadImageRequest = z.infer<typeof UploadImageRequestSchema>

/**
 * Upload a user image to the backend
 */
export async function uploadUserImage(
  userID: string,
  base64Image: string
): Promise<UploadImageResponse | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(
      `${BASE_URL}/api/v2/users/${userID}/upload-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.ok.token}`,
        },
        body: JSON.stringify({ base64Image }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to upload image: HTTP ${response.status} - ${errorText}`
      )
    }

    const result = await response.text()
    const validatedData = UploadImageResponseSchema.safeParse(result)
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error)
      return new Error("Invalid response from server")
    }

    return validatedData.data
  } catch (error) {
    console.error("Error uploading image:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

/**
 * Delete a conversation by ID
 */
export async function deleteConversation(
  userID: string,
  conversationID: string
): Promise<void | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(
      `${BASE_URL}/api/v2/users/${userID}/conversations/${conversationID}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tok.ok.token}`,
        },
      }
    )

    if (response.status === 404) {
      return new Error("Conversation not found")
    }

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to delete conversation: HTTP ${response.status} - ${errorText}`
      )
    }

    return
  } catch (error) {
    console.error("Error deleting conversation:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

/**
 * Delete user account and all associated data
 */
export async function deleteUserAccount(userID: string): Promise<void | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(`${BASE_URL}/api/v2/users/${userID}/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tok.ok.token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to delete account: HTTP ${response.status} - ${errorText}`
      )
    }

    return
  } catch (error) {
    console.error("Error deleting account:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

/**
 * Get conversation count for a user
 */
export async function getConversationCount(
  userID: string
): Promise<ConversationCountResponse | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(
      `${BASE_URL}/api/v2/users/${userID}/conversation-count`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tok.ok.token}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to get conversation count: HTTP ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()
    const validatedData = ConversationCountResponseSchema.safeParse(data)
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error)
      return new Error("Invalid response from server")
    }

    return validatedData.data
  } catch (error) {
    console.error("Error getting conversation count:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}
