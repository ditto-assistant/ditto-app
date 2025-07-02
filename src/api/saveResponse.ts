import { Result } from "@/types/common"
import { routes } from "@/firebaseConfig"
import { getToken } from "@/api/auth"

interface SaveResponseRequest {
  userID: string
  pairID: string
  response: string
}

// Saves the LLM response.
export async function saveResponse(
  pairID: string,
  response: string
): Promise<Result<void>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }
  const request: SaveResponseRequest = {
    userID: tok.ok.userID,
    pairID,
    response,
  }
  try {
    const response = await fetch(routes.saveResponse, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(request),
    })

    if (response.status === 201) {
      return { ok: void 0 }
    } else {
      return {
        err: `Unable to save response. Error: ${response.status}`,
      }
    }
  } catch (error) {
    console.error(error)
    return { err: `Unable to save response. Error: ${error}` }
  }
}
