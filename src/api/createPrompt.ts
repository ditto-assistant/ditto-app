import { Result } from "@/types/common"
import { routes } from "../firebaseConfig"
import { getToken } from "./auth"
import { getDeviceID } from "@/utils/deviceId"

export interface CreatePromptRequest {
  userID: string
  deviceID: string
  prompt: string
}

// Creates a new user prompt.
export async function createPrompt(prompt: string): Promise<Result<string>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }
  const deviceID = getDeviceID()
  const request: CreatePromptRequest = {
    userID: tok.ok.userID,
    deviceID,
    prompt,
  }
  try {
    const response = await fetch(routes.createPrompt, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(request),
    })

    if (response.ok) {
      return { ok: await response.text() }
    } else {
      return {
        err: `Unable to create prompt. Error: ${response.status}`,
      }
    }
  } catch (error) {
    console.error(error)
    return { err: `Unable to create prompt. Error: ${error}` }
  }
}
