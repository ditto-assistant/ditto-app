import { Result } from "@/types/common"
import { routes } from "../firebaseConfig"
import { getToken } from "./auth"

export async function webSearch(
  query: string,
  numResults = 5
): Promise<Result<string>> {
  const tok = await getToken()
  if (tok.err) {
    console.error(tok.err)
    return { err: "Unable to get token" }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }
  try {
    const response = await fetch(routes.search, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`
      },
      body: JSON.stringify({
        query,
        numResults,
        userID: tok.ok.userID
      })
    })
    if (response.ok) {
      return { ok: await response.text() }
    } else {
      return {
        err: `Unable to retrieve search results. Error: ${response.status}`
      }
    }
  } catch (error) {
    console.error(error)
    return { err: `Unable to retrieve search results. Error: ${error}` }
  }
}
