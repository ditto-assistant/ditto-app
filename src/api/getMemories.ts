import { Result } from "@/types/common"
import { routes } from "@/firebaseConfig"
import { getToken } from "@/api/auth"

export type ContentTypeV2 =
  | "text"
  | "image"
  | "application/pdf"
  | "audio/wav"
  | "audio/mp3"

export interface ContentV2 {
  type: ContentTypeV2
  content: string
  // optional fields present in some tool/file responses
  toolCall?: Record<string, unknown>
  annotations?: unknown
}

export interface Memory {
  id: string
  score: number
  prompt: string
  response: string
  timestamp: Date
  vector_distance: number
  depth: number
  similarity?: number // For KG pairs data
  children?: Memory[]
  // v2 fields
  input?: ContentV2[]
  output?: ContentV2[]
  // Image support fields
  hasImages?: boolean
  imageUrls?: string[]
}

export interface ParamsLongTermMemoriesV2 {
  pairID?: string
  nodeCounts: number[]
  nodeThresholds?: number[]
  vector?: number[]
  deepSearch?: boolean
}

export interface ParamsShortTermMemoriesV2 {
  k: number
}

export interface GetMemoriesV2Request {
  userID: string
  longTerm?: ParamsLongTermMemoriesV2
  shortTerm?: ParamsShortTermMemoriesV2
  stripImages: boolean
  alreadyFoundPairIDs?: string[]
}

export interface MemoriesV2Response {
  longTerm?: Memory[]
  shortTerm?: Memory[]
}

export async function getMemories(
  params: GetMemoriesV2Request,
  accept: "application/json"
): Promise<Result<MemoriesV2Response>>
export async function getMemories(
  params: GetMemoriesV2Request,
  accept: "text/plain"
): Promise<Result<string>>
export async function getMemories(
  params: GetMemoriesV2Request,
  accept: "application/json" | "text/plain"
): Promise<Result<MemoriesV2Response | string>> {
  if (!params.longTerm && !params.shortTerm) {
    return { err: "No memories requested" }
  }
  const tok = await getToken()
  if (tok.err) {
    console.error(tok.err)
    return { err: "Unable to get token" }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }

  try {
    const response = await fetch(routes.memories, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: accept,
      },
      body: JSON.stringify(params),
    })

    if (response.ok) {
      if (accept === "application/json") {
        const data = (await response.json()) as MemoriesV2Response
        return { ok: data }
      } else {
        return { ok: await response.text() }
      }
    } else {
      return {
        err: `Unable to retrieve memories. Error: ${response.status}`,
      }
    }
  } catch (error) {
    console.error(error)
    return { err: `Unable to retrieve memories. Error: ${error}` }
  }
}
