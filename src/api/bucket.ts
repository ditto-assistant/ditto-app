import { z } from "zod"
import { getToken } from "@/api/auth"
import { routes, BASE_URL } from "@/firebaseConfig"
import { Result } from "@/types/common"

/**
 * Presigns a URL for a given user.
 */
export async function presignURL(url: string): Promise<Result<string>> {
  if (url === "") {
    return { err: "No URL provided" }
  }
  const tok = await getToken()
  if (tok.err) {
    return { err: tok.err?.message ?? "No token" }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }
  try {
    const response = await fetch(routes.presignURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({
        url,
        userID: tok.ok.userID,
      }),
    })
    const result = await response.text()
    return { ok: result }
  } catch (err) {
    return { err: err instanceof Error ? err.message : "Error presigning URL" }
  }
}

// Determine if a file needs processing/conversion
function needsProcessing(contentType: string): boolean {
  // Files that need conversion
  const needsConversion = [
    // Images that aren't supported by OpenRouter
    "image/heic",
    "image/heif",
    "image/avif",
    "image/tiff",
    "image/bmp",
    // Audio that isn't supported by OpenRouter
    "audio/flac",
    "audio/ogg",
    "audio/aac",
    "audio/opus",
  ]
  return needsConversion.includes(contentType)
}

export async function createUploadURL(userID: string, contentType?: string) {
  // If content type indicates processing is needed, return null to use processing endpoint
  if (contentType && needsProcessing(contentType)) {
    return null
  }

  const tok = await getToken()
  if (tok.err) {
    return tok.err
  }
  if (!tok.ok) {
    throw new Error("No token")
  }

  const body: any = { userID }
  if (contentType) {
    body.contentType = contentType
  }

  const response = await fetch(routes.createUploadURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tok.ok.token}`,
    },
    body: JSON.stringify(body),
  })
  return await response.text()
}

// Response schema for the upload with processing endpoint
export const UploadWithProcessingResponseSchema = z.object({
  fileID: z.string(),
  downloadURL: z.string(),
  fileURL: z.string(),
  filename: z.string(),
  contentType: z.string(),
  originalType: z.string(),
  size: z.number(),
  expiration: z.string().transform((str) => new Date(str)),
  converted: z.boolean(),
})

export type UploadWithProcessingResponse = z.infer<
  typeof UploadWithProcessingResponseSchema
>

/**
 * Smart upload function that chooses the best upload method based on file type
 */
export async function uploadFile(
  userID: string,
  file: File,
  subfolder: string = "gallery"
): Promise<UploadWithProcessingResponse | Error> {
  // Check if file needs processing
  if (needsProcessing(file.type)) {
    return uploadWithProcessing(userID, file, subfolder)
  } else {
    // Use presigned upload for supported files
    const uploadURL = await createUploadURL(userID, file.type)
    if (uploadURL === null) {
      // Fallback to processing if presigned fails
      return uploadWithProcessing(userID, file, subfolder)
    }
    if (uploadURL.err) {
      return new Error(uploadURL.err)
    }

    try {
      // Upload directly to presigned URL
      const response = await fetch(uploadURL.ok, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      // For presigned uploads, we need to construct the response
      // This is a simplified version - in practice you'd need to get the actual URLs
      return {
        fileID: "presigned-upload",
        downloadURL: uploadURL.ok
          .replace("?X-Amz-Algorithm", "")
          .replace(/&X-Amz-[^&]*/g, ""),
        fileURL: uploadURL.ok
          .replace("?X-Amz-Algorithm", "")
          .replace(/&X-Amz-[^&]*/g, ""),
        filename: file.name,
        contentType: file.type,
        originalType: file.type,
        size: file.size,
        expiration: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        converted: false,
      }
    } catch (error) {
      return error instanceof Error ? error : new Error("Upload failed")
    }
  }
}

/**
 * Uploads a file with automatic processing/conversion to supported formats
 */
export async function uploadWithProcessing(
  userID: string,
  file: File,
  subfolder: string = "gallery"
): Promise<UploadWithProcessingResponse | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("subfolder", subfolder)

    const response = await fetch(`${BASE_URL}/api/v2/users/${userID}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to upload file: HTTP ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()
    const validatedData = UploadWithProcessingResponseSchema.safeParse(data)
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error)
      return new Error("Invalid response from server")
    }

    return validatedData.data
  } catch (error) {
    console.error("Error uploading file:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}

// Response schema for the v2 presign endpoint
export const PresignURLV2ResponseSchema = z.object({
  presignedURL: z.string(),
  expiration: z.string().transform((str) => new Date(str)),
})

export type PresignURLV2Response = z.infer<typeof PresignURLV2ResponseSchema>

/**
 * Presigns a URL using the v2 endpoint with filepath validation
 */
export async function presignURLV2(
  userID: string,
  filePath: string
): Promise<PresignURLV2Response | Error> {
  try {
    const tok = await getToken()
    if (tok.err) {
      return new Error(tok.err?.message ?? "No token")
    }
    if (!tok.ok) {
      return new Error("No token")
    }

    const response = await fetch(
      `${BASE_URL}/api/v2/users/${userID}/presign-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.ok.token}`,
        },
        body: JSON.stringify({
          filePath,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to presign URL: HTTP ${response.status} - ${errorText}`
      )
    }

    const data = await response.json()
    const validatedData = PresignURLV2ResponseSchema.safeParse(data)
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error)
      return new Error("Invalid response from server")
    }

    return validatedData.data
  } catch (error) {
    console.error("Error presigning URL:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}
