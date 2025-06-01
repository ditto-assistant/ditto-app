import { z } from "zod"
import { getToken } from "./auth"
import { routes, BASE_URL } from "../firebaseConfig"
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

export async function createUploadURL(userID: string) {
  const tok = await getToken()
  if (tok.err) {
    return tok.err
  }
  if (!tok.ok) {
    throw new Error("No token")
  }
  const response = await fetch(routes.createUploadURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tok.ok.token}`,
    },
    body: JSON.stringify({
      userID,
    }),
  })
  return await response.text()
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
