import { Result } from "@/types/common";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";

interface SearchExamplesRequest {
  userID: string;
  pairID: string;
  k: number;
}

// Retrieves relevant examples for the pairID.
export async function searchExamples(
  pairID: string,
  k: number = 5,
): Promise<Result<string>> {
  const tok = await getToken();
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` };
  }
  if (!tok.ok) {
    return { err: "No token" };
  }
  const request: SearchExamplesRequest = {
    userID: tok.ok.userID,
    pairID,
    k,
  };
  try {
    const response = await fetch(routes.searchExamples, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(request),
    });
    if (response.ok) {
      const data = await response.text();
      return { ok: data };
    } else {
      return {
        err: `Unable to search examples. Error: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(error);
    return { err: `Unable to search examples. Error: ${error}` };
  }
}
