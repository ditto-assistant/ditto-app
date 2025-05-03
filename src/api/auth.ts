import { auth } from "../control/firebase"

interface TokenSuccess {
  token: string
  userID: string
  email: string | null
}

interface TokenResult {
  ok?: TokenSuccess
  err?: Error
}

/**
 * Retrieves the authentication token for the current user.
 *
 * @returns {Promise<TokenResult>} A promise that resolves to an object containing either success or error data
 */
export async function getToken(): Promise<TokenResult> {
  if (!auth.currentUser) {
    return { err: new Error("User not logged in") }
  }
  try {
    const token = await auth.currentUser.getIdToken()
    return {
      ok: {
        token: token,
        userID: auth.currentUser.uid,
        email: auth.currentUser.email,
      },
    }
  } catch (error) {
    return { err: error instanceof Error ? error : new Error(String(error)) }
  }
}
