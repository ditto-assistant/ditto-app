import { z } from "zod"
import { Result } from "@/types/common"
import { BASE_URL } from "../firebaseConfig"
import { getToken } from "./auth"
import { User, UserSchema } from "./getUser"

// Define the request schema for updating user name
export const UpdateUserNameRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
})

export type UpdateUserNameRequest = z.infer<typeof UpdateUserNameRequestSchema>

export async function updateUserName(
  userID: string,
  nameData: UpdateUserNameRequest
): Promise<Result<User>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }

  const url = `${BASE_URL}/api/v2/users/${userID}/name`
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(nameData),
    })

    if (response.ok) {
      const rawData: unknown = await response.json()
      const result = UserSchema.safeParse(rawData)
      if (result.success) {
        return { ok: result.data }
      } else {
        console.error("Zod validation error:", result.error.flatten())
        return {
          err: `Invalid user data received from API. Error: ${result.error.message}`,
        }
      }
    } else {
      const errorText = await response.text()
      return {
        err: `Unable to update user name. Error: ${response.status} - ${errorText}`,
      }
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return { err: `Unable to update user name. Error: ${error}` }
  }
}