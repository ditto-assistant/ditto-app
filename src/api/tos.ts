import { z } from "zod"
import { BASE_URL } from "@/firebaseConfig"
import { getToken } from "@/api/auth"

// Define the Terms of Service schema
export const TermsOfServiceSchema = z.object({
  id: z.number(),
  content: z.string(),
  version: z.string(),
  published_at: z.string(),
})

// Define the TOS acceptance status schema
export const TOSAcceptanceStatusSchema = z.object({
  has_accepted: z.boolean(),
  tos_version: z.string().optional(),
  accepted_at: z.string().optional(),
})

// Export types from the schemas
export type TermsOfService = z.infer<typeof TermsOfServiceSchema>
export type TOSAcceptanceStatus = z.infer<typeof TOSAcceptanceStatusSchema>

/**
 * Fetches the Terms of Service from the API
 * @param version - Optional specific version to fetch
 * @returns Result containing TermsOfService or error
 */
export async function fetchTermsOfService(
  version?: string
): Promise<TermsOfService | Error> {
  try {
    const url = version
      ? `${BASE_URL}/api/v2/terms-of-service/${version}`
      : `${BASE_URL}/api/v2/terms-of-service`

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return new Error(
        `Failed to fetch Terms of Service: ${response.statusText}`
      )
    }

    const rawData: unknown = await response.json()
    const result = TermsOfServiceSchema.safeParse(rawData)

    if (result.success) {
      return result.data
    } else {
      console.error("Validation error:", result.error.flatten())
      return new Error(
        `Invalid Terms of Service data. Error: ${result.error.message}`
      )
    }
  } catch (error) {
    console.error("Error fetching Terms of Service:", error)
    return new Error(
      error instanceof Error ? error.message : "Unknown error occurred"
    )
  }
}

/**
 * Checks if the user has accepted the latest Terms of Service
 * @param userId - The user ID to check
 * @returns Result containing TOSAcceptanceStatus or error
 */
export async function checkTOSAcceptanceStatus(
  userId: string
): Promise<TOSAcceptanceStatus | Error> {
  const tok = await getToken()
  if (tok.err) {
    return new Error(`Unable to get token: ${tok.err}`)
  }
  if (!tok.ok) {
    return new Error("No token")
  }

  try {
    const url = `${BASE_URL}/api/v2/users/${userId}/tos-status`
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
    })

    if (!response.ok) {
      return new Error(
        `Failed to check TOS acceptance status: ${response.statusText}`
      )
    }

    const rawData: unknown = await response.json()
    const result = TOSAcceptanceStatusSchema.safeParse(rawData)

    if (result.success) {
      return result.data
    } else {
      console.error("Validation error:", result.error.flatten())
      return new Error(
        `Invalid TOS acceptance data. Error: ${result.error.message}`
      )
    }
  } catch (error) {
    console.error("Error checking TOS acceptance status:", error)
    return new Error(
      error instanceof Error ? error.message : "Unknown error occurred"
    )
  }
}

/**
 * Accepts the Terms of Service for a user
 * @param userId - The user ID accepting the TOS
 * @param tosId - The ID of the Terms of Service being accepted
 * @returns Result indicating success or error
 */
export async function acceptTermsOfService(
  userId: string,
  tosId: number
): Promise<{ success: boolean } | Error> {
  const tok = await getToken()
  if (tok.err) {
    return new Error(`Unable to get token: ${tok.err}`)
  }
  if (!tok.ok) {
    return new Error("No token")
  }

  try {
    const url = `${BASE_URL}/api/v2/terms-of-service/accept`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({
        userID: userId,
        tosID: tosId,
      }),
    })

    if (!response.ok) {
      return new Error(
        `Failed to accept Terms of Service: ${response.statusText}`
      )
    }

    const data = await response.json()
    return { success: data.success === true }
  } catch (error) {
    console.error("Error accepting Terms of Service:", error)
    return new Error(
      error instanceof Error ? error.message : "Unknown error occurred"
    )
  }
}
