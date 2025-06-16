import { routes } from "../firebaseConfig"
import { getToken } from "./auth"
import { Result } from "@/types/common"
import type {
  Subject,
  SubjectSearchResult,
  PairSearchResult,
} from "@/types/common"

export async function searchSubjects({
  userID,
  userEmail,
  query,
  topK = 10,
  minSimilarity = 0.1,
}: {
  userID?: string
  userEmail?: string
  query: string
  topK?: number
  minSimilarity?: number
}): Promise<Result<SubjectSearchResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgSubjectsSearch, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        query,
        top_k: topK,
        min_similarity: minSimilarity,
      }),
    })
    if (response.ok) {
      const data = (await response.json()) as SubjectSearchResult
      return { ok: data }
    } else {
      return { err: `Unable to search subjects. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to search subjects. Error: ${error}` }
  }
}

export async function searchPairs({
  userID,
  userEmail,
  query,
  topK = 5,
}: {
  userID?: string
  userEmail?: string
  query: string
  topK?: number
}): Promise<Result<PairSearchResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgPairsSearch, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        query,
        top_k: topK,
      }),
    })
    if (response.ok) {
      const data = (await response.json()) as PairSearchResult
      return { ok: data }
    } else {
      return { err: `Unable to search pairs. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to search pairs. Error: ${error}` }
  }
}

export async function getSubjectPairs({
  userID,
  userEmail,
  subjectID,
  subjectText,
  query,
  topK = 5,
}: {
  userID?: string
  userEmail?: string
  subjectID?: string
  subjectText?: string
  query: string
  topK?: number
}): Promise<Result<PairSearchResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgSubjectPairs, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        subject_id: subjectID,
        subject_text: subjectText,
        query,
        top_k: topK,
      }),
    })
    if (response.ok) {
      const data = (await response.json()) as PairSearchResult
      return { ok: data }
    } else {
      return { err: `Unable to get subject pairs. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to get subject pairs. Error: ${error}` }
  }
}

export async function getTopSubjects({
  userID,
  userEmail,
  limit = 10,
  offset = 0,
}: {
  userID?: string
  userEmail?: string
  limit?: number
  offset?: number
}): Promise<
  Result<{ results: Subject[]; metadata: { limit: number; offset: number } }>
> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgTopSubjects, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        limit,
        offset,
      }),
    })
    if (response.ok) {
      const data = await response.json()
      return { ok: data }
    } else {
      return { err: `Unable to get top subjects. Error: ${response.status}` }
    }
  } catch (error) {
    return { err: `Unable to get top subjects. Error: ${error}` }
  }
}

export async function getSubjectPairsRecent({
  userID,
  userEmail,
  subjectID,
  subjectText,
  limit = 5,
  offset = 0,
}: {
  userID?: string
  userEmail?: string
  subjectID?: string
  subjectText?: string
  limit?: number
  offset?: number
}): Promise<Result<PairSearchResult>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgSubjectPairsRecent, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        subject_id: subjectID,
        subject_text: subjectText,
        limit,
        offset,
      }),
    })
    if (response.ok) {
      const data = (await response.json()) as PairSearchResult
      return { ok: data }
    } else {
      return {
        err: `Unable to get recent subject pairs. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Unable to get recent subject pairs. Error: ${error}` }
  }
}

export async function renameSubject({
  userID,
  userEmail,
  subjectId,
  newSubjectText,
}: {
  userID?: string
  userEmail?: string
  subjectId: string
  newSubjectText: string
}): Promise<Result<{ success: boolean; subject: Subject; message: string }>> {
  const tok = await getToken()
  if (tok.err) return { err: "Unable to get token" }
  if (!tok.ok) return { err: "No token" }

  try {
    const response = await fetch(routes.kgRenameSubject(subjectId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: userID,
        user_email: userEmail,
        new_subject_text: newSubjectText,
      }),
    })
    if (response.ok) {
      const data = await response.json()
      return { ok: data }
    } else {
      return {
        err: `Unable to rename subject. Error: ${response.status}`,
      }
    }
  } catch (error) {
    return { err: `Unable to rename subject. Error: ${error}` }
  }
}
