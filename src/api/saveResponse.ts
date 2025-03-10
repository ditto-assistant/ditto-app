import { Result } from "@/types/common";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";

interface SaveResponseRequest {
  userID: string;
  pairID: string;
  response: string;
  encryptedContent?: {
    ciphertext: string;
    iv: string;
    keyId: string;
  };
}

// Saves the LLM response.
export async function saveResponse(
  pairID: string,
  response: string,
  encryptedContent?: { ciphertext: string; iv: string; keyId: string }
): Promise<Result<void>> {
  const tok = await getToken();
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` };
  }
  if (!tok.ok) {
    return { err: "No token" };
  }
  const request: SaveResponseRequest = {
    userID: tok.ok.userID,
    pairID,
    response,
    ...(encryptedContent && { encryptedContent }),
  };
  
  // Set headers (to support encrypted content)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${tok.ok.token}`,
  };
  
  // Update content type for encrypted requests
  if (encryptedContent) {
    headers["Content-Type"] = "application/json+encrypted";
  }
  
  try {
    const response = await fetch(routes.saveResponse, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (response.status === 201) {
      return { ok: void 0 };
    } else {
      return {
        err: `Unable to save response. Error: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(error);
    return { err: `Unable to save response. Error: ${error}` };
  }
}
