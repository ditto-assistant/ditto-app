import { z } from "zod"
import { Result } from "@/types/common"
import { BASE_URL } from "../firebaseConfig"
import { getToken } from "./auth"

// Define the request schema for creating a user
export const CreateUserRequestSchema = z.object({
  userID: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
})

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>

export async function createUser(
  userData: CreateUserRequest
): Promise<Result<void>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }

  const url = `${BASE_URL}/api/v2/users`
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(userData),
    })

    if (response.ok) {
      return { ok: undefined }
    } else {
      const errorText = await response.text()
      return {
        err: `Unable to create user. Error: ${response.status} - ${errorText}`,
      }
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return { err: `Unable to create user. Error: ${error}` }
  }
}
