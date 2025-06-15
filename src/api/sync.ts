import { routes } from "../firebaseConfig"
import { getToken } from "./auth"
import { Result } from "@/types/common"

export async function syncUserData(
  userID: string,
  onProgress?: (stage: number, status: string) => void
): Promise<Result<void>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgSyncUser, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
      }),
    })

    if (response.ok) {
      // Process the streaming response to get real-time status updates
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n").filter((line) => line.trim())

            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                console.log("🔄 [Sync] Status:", data.status)

                // Parse stage from status messages
                if (onProgress && data.status) {
                  let stage = 1 // default

                  if (
                    data.status.includes("Step 1/3") ||
                    data.status.includes("Syncing memories from Firestore")
                  ) {
                    stage = 1
                  } else if (
                    data.status.includes("Step 2/3") ||
                    data.status.includes("Generating subjects")
                  ) {
                    stage = 2
                  } else if (
                    data.status.includes("Step 3/3") ||
                    data.status.includes("Storing generated data") ||
                    data.status.includes("Storing KG data")
                  ) {
                    stage = 3
                  } else if (
                    data.status.includes("complete") ||
                    data.status.includes("Complete") ||
                    data.status.includes("storage complete") ||
                    data.status.includes("sync completed") ||
                    data.status === "complete"
                  ) {
                    stage = 4 // Finalizing stage
                  }

                  onProgress(stage, data.status)
                }

                if (data.status === "complete") {
                  console.log("✅ [Sync] Completed successfully")
                  return { ok: undefined }
                } else if (data.status === "error") {
                  console.error("❌ [Sync] Error:", data.message)
                  return { err: data.message || "Sync failed" }
                }
                // Continue processing for other status updates
              } catch (parseError) {
                // Ignore parse errors for partial JSON chunks
                console.debug("Ignoring partial JSON chunk:", line)
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      }

      return { ok: undefined }
    } else {
      return { err: `Unable to sync user data. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to sync user data. Error: ${error}` }
  }
}
