import { z } from "zod"
import { getToken } from "./auth"
import { BASE_URL, routes } from "../firebaseConfig"

// Response schemas
export const UploadImageResponseSchema = z.string()
export type UploadImageResponse = z.infer<typeof UploadImageResponseSchema>

export const PresignedUploadResponseSchema = z.object({
  uploadURL: z.string(),
  fileURL: z.string(),
  fields: z.record(z.string()).optional(),
  expiration: z.string().transform((str) => new Date(str)),
})
export type PresignedUploadResponse = z.infer<
  typeof PresignedUploadResponseSchema
>

export const ConversationCountResponseSchema = z.object({
  count: z.number(),
})
export type ConversationCountResponse = z.infer<
  typeof ConversationCountResponseSchema
>

export const DeleteMemoryPairResponseSchema = z.object({
  success: z.boolean(),
  cleanup_stats: z.object({
    pairs_deleted: z.number(),
    subjects_removed: z.number(),
    links_removed: z.number(),
  }),
})
export type DeleteMemoryPairResponse = z.infer<
  typeof DeleteMemoryPairResponseSchema
>

// Request schemas
export const UploadImageRequestSchema = z.object({
  base64Image: z.string(),
})
export type UploadImageRequest = z.infer<typeof UploadImageRequestSchema>

export const CreatePresignedUploadRequestSchema = z.object({
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
})
export type CreatePresignedUploadRequest = z.infer<
  typeof CreatePresignedUploadRequestSchema
>

/**
 * Create a presigned upload URL for file upload
 */
export async function createPresignedUpload(
  userID: string,
  contentType?: string,
  fileSize?: number
): Promise<PresignedUploadResponse | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const requestBody: CreatePresignedUploadRequest = {}
    if (contentType) requestBody.contentType = contentType
    if (fileSize) requestBody.fileSize = fileSize

    const response = await fetch(
      `${BASE_URL}/api/v2/users/${userID}/upload/presigned`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.ok.token}`,
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to create presigned upload URL: HTTP ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()
    const validatedData = PresignedUploadResponseSchema.safeParse(data)
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error)
      return new Error("Invalid response from server")
    }

    return validatedData.data
  } catch (error) {
    console.error("Error creating presigned upload URL:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

/**
 * Upload a user image using presigned URL approach
 */
export async function uploadImage(
  userID: string,
  imageData: string | File
): Promise<string | Error> {
  try {
    let file: File
    let contentType: string

    if (typeof imageData === "string") {
      // Convert base64 to File
      const response = await fetch(imageData)
      const blob = await response.blob()
      contentType = blob.type || "image/jpeg"
      file = new File([blob], "image.jpg", { type: contentType })
    } else {
      // Already a File
      file = imageData
      contentType = file.type || "image/jpeg"
    }

    // Get presigned upload URL
    const presignedResponse = await createPresignedUpload(
      userID,
      contentType,
      file.size
    )

    if (presignedResponse instanceof Error) {
      return presignedResponse
    }

    console.log("Uploading to:", presignedResponse.uploadURL)

    // Upload file to S3 using presigned URL
    const uploadResponse = await fetch(presignedResponse.uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    })

    if (!uploadResponse.ok) {
      return new Error(`Failed to upload file: HTTP ${uploadResponse.status}`)
    }
    // Extract the file path from the fileURL to use with v2 presign
    const { presignURLV2 } = await import("@/api/bucket")

    // Extract the userID and path from the fileURL
    // URL format: https://content-prefix/userID/attachments/gallery/filename.jpg
    const url = new URL(presignedResponse.fileURL)
    const pathParts = url.pathname.split("/")
    const userIndex = pathParts.findIndex((part) => part === userID)

    if (userIndex === -1 || userIndex + 1 >= pathParts.length) {
      return new Error("Invalid file URL format")
    }

    // Extract the path after userID (e.g., "attachments/gallery/filename.jpg")
    const filePath = pathParts.slice(userIndex + 1).join("/")

    const presignResult = await presignURLV2(userID, filePath)
    if (presignResult instanceof Error) {
      return new Error(
        `Failed to presign uploaded image: ${presignResult.message}`
      )
    }

    // Return the presigned URL
    return presignResult.presignedURL
  } catch (error) {
    console.error("Error uploading image with presigned URL:", error)
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
 * Delete a memory pair from the knowledge graph
 */
export async function deleteMemoryPairFromKG(
  userID: string,
  pairID: string
): Promise<DeleteMemoryPairResponse | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(routes.kgDeleteMemoryPair(pairID), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({
        user_id: userID,
      }),
    })

    if (response.status === 404) {
      // Memory pair not found in KG - this is not necessarily an error
      // as the pair might only exist in Firestore
      console.log(`Memory pair ${pairID} not found in knowledge graph`)
      const defaultResponse: DeleteMemoryPairResponse = {
        success: true,
        cleanup_stats: {
          pairs_deleted: 0,
          subjects_removed: 0,
          links_removed: 0,
        },
      }
      return defaultResponse
    }

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to delete memory pair from KG: HTTP ${response.status} - ${errorText}`
      )
    }

    const rawData: unknown = await response.json()
    const validatedResponse = DeleteMemoryPairResponseSchema.safeParse(rawData)
    if (!validatedResponse.success) {
      return new Error(
        `Failed to delete memory pair from KG: Invalid response data: ${validatedResponse.error.flatten()}`
      )
    }

    return validatedResponse.data
  } catch (error) {
    console.error("Error deleting memory pair from KG:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

/**
 * Delete a conversation completely - from both Firestore and Knowledge Graph
 */
export async function deleteConversationComplete(
  userID: string,
  conversationID: string
): Promise<{ firestore_deleted: boolean; kg_cleanup: any } | Error> {
  try {
    // First delete from Firestore
    const firestoreResult = await deleteConversation(userID, conversationID)
    const firestoreDeleted = !(firestoreResult instanceof Error)

    if (firestoreResult instanceof Error) {
      console.warn(
        `Failed to delete from Firestore: ${firestoreResult.message}`
      )
    }

    // Then delete from Knowledge Graph
    const kgResult = await deleteMemoryPairFromKG(userID, conversationID)

    if (kgResult instanceof Error) {
      console.warn(`Failed to delete from KG: ${kgResult.message}`)
      // If Firestore deletion succeeded but KG deletion failed,
      // we should still consider this a partial success
      return {
        firestore_deleted: firestoreDeleted,
        kg_cleanup: { error: kgResult.message },
      }
    }

    return {
      firestore_deleted: firestoreDeleted,
      kg_cleanup: kgResult,
    }
  } catch (error) {
    console.error("Error in complete conversation deletion:", error)
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
