import { Result } from "@/types/common"
import { routes } from "../firebaseConfig"
import { getToken } from "./auth"

export interface SubjectWithCount {
  subject_text: string
  pair_count: number
}

export async function getSubjectsForPairs(
  pairIDs: string[]
): Promise<Result<Map<string, SubjectWithCount[]>>> {
  if (pairIDs.length === 0) {
    return { ok: new Map() }
  }

  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.pairSubjects, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify({
        pair_ids: pairIDs,
      }),
    })

    if (response.ok) {
      const subjects = (await response.json()) as Record<
        string,
        SubjectWithCount[]
      >
      return { ok: new Map(Object.entries(subjects)) }
    } else {
      return {
        err: `Failed to get subjects for pairs. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Failed to get subjects for pairs. Error: ${error}` }
  }
} 