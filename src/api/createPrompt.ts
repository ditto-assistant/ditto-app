import { Result } from "@/types/common";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";
import { getDeviceID } from "@/utils/deviceId";

export interface CreatePromptRequest {
  userID: string;
  deviceID: string;
  prompt: string;
  encryptedContent?: {
    ciphertext: string;
    iv: string;
    keyId: string;
  };
}

// Creates a new user prompt.
export async function createPrompt(
  prompt: string, 
  encryptedContent?: { ciphertext: string; iv: string; keyId: string }
): Promise<Result<string>> {
  const tok = await getToken();
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` };
  }
  if (!tok.ok) {
    return { err: "No token" };
  }
  const deviceID = getDeviceID();
  const request: CreatePromptRequest = {
    userID: tok.ok.userID,
    deviceID,
    prompt,
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
    const response = await fetch(routes.createPrompt, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (response.ok) {
      return { ok: await response.text() };
    } else {
      return {
        err: `Unable to create prompt. Error: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(error);
    return { err: `Unable to create prompt. Error: ${error}` };
  }
}
