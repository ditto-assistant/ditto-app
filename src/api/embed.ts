import { Result } from "@/types/common"
import { routes } from "@/firebaseConfig"
import { getToken } from "@/api/auth"

// Embeds text into vector space.
export async function embed(request: {
  userID: string
  text: string
  model: string
}): Promise<Result<number[]>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }

  try {
    const response = await fetch(routes.embed, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(request),
    })

    if (response.ok) {
      const data = await response.json()
      return { ok: data }
    } else {
      return {
        err: `Unable to create embedding. Error: ${response.status}`,
      }
    }
  } catch (error) {
    console.error(error)
    return { err: `Unable to create embedding. Error: ${error}` }
  }
}
