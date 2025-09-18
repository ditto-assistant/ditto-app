import { getToken } from "@/api/auth"
import { BASE_URL } from "@/firebaseConfig"

export interface ReadAloudJSONResponse {
  url: string
}

export type ReadTarget = "prompt" | "response"

export async function requestReadAloud(
  userID: string,
  pairID: string,
  target: ReadTarget = "response",
  signal?: AbortSignal
): Promise<Response> {
  const tok = await getToken()
  if (tok.err) {
    throw new Error(tok.err.message)
  }
  if (!tok.ok) {
    throw new Error("User not authenticated")
  }

  const endpoint = `${BASE_URL}/api/v3/users/${encodeURIComponent(
    userID
  )}/conversations/${encodeURIComponent(pairID)}/${target}/readaloud`

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tok.ok.token}`,
      Accept: "*/*",
    },
    signal,
  })

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null)
      const message = data?.error || data?.message || `HTTP ${res.status}`
      throw new Error(`ReadAloud failed: ${message}`)
    }
    throw new Error(`ReadAloud failed: HTTP ${res.status}`)
  }

  return res
}
