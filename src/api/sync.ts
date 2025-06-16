import { routes } from "../firebaseConfig"
import { getToken } from "./auth"
import { Result } from "@/types/common"

export async function startSync(
  userID: string,
  messageID: string
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
      },
      body: JSON.stringify({
        user_id: userID,
        message_id: messageID,
      }),
    })

    if (response.ok) {
      return { ok: undefined }
    } else {
      return { err: `Failed to start sync. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Failed to start sync. Error: ${error}` }
  }
}

interface SyncStatus {
  stage: number
  status: string
}

export async function getSyncStatus(
  messageIDs: string[]
): Promise<Result<Map<string, SyncStatus>>> {
  if (messageIDs.length === 0) {
    return { ok: new Map() }
  }

  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.syncStatus, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({
        message_ids: messageIDs,
      }),
    })

    if (response.ok) {
      const statuses = (await response.json()) as Record<string, SyncStatus>
      return { ok: new Map(Object.entries(statuses)) }
    } else {
      return { err: `Failed to get sync status. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Failed to get sync status. Error: ${error}` }
  }
}
