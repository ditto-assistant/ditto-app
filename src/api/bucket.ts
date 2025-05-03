import { getToken } from "./auth"
import { routes } from "../firebaseConfig"
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
