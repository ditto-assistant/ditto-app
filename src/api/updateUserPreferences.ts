import { z } from "zod";
import { BASE_URL } from "../firebaseConfig";
import { getToken } from "./auth";
import { Model } from "@/types/llm";

// Define success response schema
export const UpdateUserPreferencesResponseSchema = z.object({
  success: z.boolean(),
});

export type UpdateUserPreferencesResponse = z.infer<typeof UpdateUserPreferencesResponseSchema>;

// Special error for payment required
export const ErrorPaymentRequired = new Error("Payment required");

// The fields in the update are optional because we only need to send
// the fields that are changing, but the fields themselves are required in the database
export type UserPreferencesUpdate = {
  preferredMainModel?: Model;
  preferredProgrammerModel?: Model;
  preferredImageModel?: Model;
  theme?: "light" | "dark" | "system";
};

/**
 * Updates user preferences on the server
 * @param userID The user ID to update preferences for
 * @param preferences The preferences to update
 * @returns Either UpdateUserPreferencesResponse on success or Error on failure
 */
export async function updateUserPreferences(
  userID: string,
  preferences: UserPreferencesUpdate
): Promise<UpdateUserPreferencesResponse | Error> {
  const tok = await getToken();
  if (tok.err) {
    return new Error(`Unable to get token: ${tok.err}`);
  }
  if (!tok.ok) {
    return new Error("No token");
  }

  try {
    const response = await fetch(`${BASE_URL}/api/v2/users/${userID}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(preferences),
    });

    // Handle special error cases
    if (response.status === 402) {
      return ErrorPaymentRequired;
    }

    if (!response.ok) {
      const errorText = await response.text();
      return new Error(`Failed to update preferences: HTTP ${response.status} - ${errorText}`);
    }

    // For endpoints returning 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    // If the endpoint returns a JSON response, parse and validate it
    const data = await response.json();
    
    // Validate response with Zod
    const validatedData = UpdateUserPreferencesResponseSchema.safeParse(data);
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error);
      return new Error("Invalid response from server");
    }

    return validatedData.data;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return error instanceof Error 
      ? error 
      : new Error("Unknown error occurred");
  }
}