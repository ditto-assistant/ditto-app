import { BASE_URL } from "@/firebaseConfig";
import { Memory } from "./getMemories";
import { getToken } from "@/api/auth";
import { Result } from "@/types/common";

export interface ConversationResponse {
  messages: Memory[];
  nextCursor: string;
}

export async function getConversations(
  cursor?: string,
  limit: number = 5,
): Promise<Result<ConversationResponse>> {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return { err: `getConversations: Unable to get auth token: ${tok.err}` };
  }
  if (!tok.ok) {
    return { err: "getConversations: No token" };
  }

  const params = new URLSearchParams({
    userId: tok.ok.userID,
    limit: limit.toString(),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  try {
    const response = await fetch(`${BASE_URL}/v1/conversations?${params}`, {
      headers: {
        Authorization: `Bearer ${tok.ok.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { err: "Failed to fetch conversations" };
    }

    const data = await response.json();
    return { ok: data as ConversationResponse };
  } catch (error) {
    console.error(error);
    return { err: `getConversations: Network error: ${error}` };
  }
}
