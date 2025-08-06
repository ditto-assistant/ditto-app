import { BASE_URL } from "@/firebaseConfig"
import { getToken } from "@/api/auth"
import { PreferredModels, UserSchema, User, ToolPreferences, MemoryPreferences, SpeechPreferences } from "./getUser"

// Special error for payment required
export const ErrorPaymentRequired = new Error("Payment required")

// Type definitions for preference updates
export type UserPreferencesUpdate = {
  preferredModels?: Partial<PreferredModels>
  theme?: "light" | "dark" | "system"
  tools?: Partial<ToolPreferences>
  memory?: Partial<MemoryPreferences>
  speech?: Partial<SpeechPreferences>
}

/**
 * Updates user preferences on the server
 * @param userID The user ID to update preferences for
 * @param preferences The preferences to update
 * @returns Either User object on success or Error on failure
 */
export async function updateUserPreferences(
  userID: string,
  preferences: UserPreferencesUpdate
): Promise<User | Error> {
  const tok = await getToken()
  if (tok.err) {
    return new Error(`Unable to get token: ${tok.err}`)
  }
  if (!tok.ok) {
    return new Error("No token")
  }

  try {
    const response = await fetch(`${BASE_URL}/api/v2/users/${userID}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(preferences),
    })

    // Handle special error cases
    if (response.status === 402) {
      return ErrorPaymentRequired
    }

    if (!response.ok) {
      const errorText = await response.text()
      return new Error(
        `Failed to update preferences: HTTP ${response.status} - ${errorText}`
      )
    }

    // Parse and validate response
    const data = await response.json()

    // Validate response with Zod
    const validatedData = UserSchema.safeParse(data)
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error)
      return new Error("Invalid response from server")
    }

    return validatedData.data
  } catch (error) {
    console.error("Error updating user preferences:", error)
    return error instanceof Error ? error : new Error("Unknown error occurred")
  }
}
