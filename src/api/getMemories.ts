import { Result } from "@/types/common";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";

interface ParamsLongTermMemoriesV2 {
  vector: number[];
  nodeCounts: number[];
}

interface ParamsShortTermMemoriesV2 {
  k: number;
}

interface GetMemoriesV2Request {
  userID: string;
  longTerm?: ParamsLongTermMemoriesV2;
  shortTerm?: ParamsShortTermMemoriesV2;
  stripImages: boolean;
}

interface Memory {
  id: string;
  score: number;
  prompt: string;
  response: string;
  timestamp: string;
  vector_distance: number;
}

interface MemoriesV2Response {
  longTerm: Memory[];
  shortTerm: Memory[];
}

export async function getMemories(
  params: GetMemoriesV2Request,
  accept: "application/json"
): Promise<Result<MemoriesV2Response>>;
export async function getMemories(
  params: GetMemoriesV2Request,
  accept: "text/plain"
): Promise<Result<string>>;
export async function getMemories(
  params: GetMemoriesV2Request,
  accept: "application/json" | "text/plain"
): Promise<Result<MemoriesV2Response | string>> {
  if (!params.longTerm && !params.shortTerm) {
    return { err: "No memories requested" };
  }
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return { err: "Unable to get token" };
  }
  if (!tok.ok) {
    return { err: "No token" };
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
    });

    if (response.ok) {
      if (accept === "application/json") {
        const data = (await response.json()) as MemoriesV2Response;
        return { ok: data };
      } else {
        return { ok: await response.text() };
      }
    } else {
      return {
        err: `Unable to retrieve memories. Error: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(error);
    return { err: `Unable to retrieve memories. Error: ${error}` };
  }
}
