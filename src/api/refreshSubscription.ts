import { Result } from "@/types/common";
import { BASE_URL } from "../firebaseConfig";
import { getToken } from "./auth";

export interface RefreshSubscriptionResponse {
  success: boolean;
  message: string;
  planTier: number;
  subscriptionStatus: string;
}

export async function refreshUserSubscription(
  userId: string,
): Promise<Result<RefreshSubscriptionResponse>> {
  const tok = await getToken();
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` };
  }
  if (!tok.ok) {
    return { err: "No token" };
  }

  try {
    const response = await fetch(
      `${BASE_URL}/api/v2/users/${userId}/refresh-subscription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.ok.token}`,
        },
      },
    );

    if (response.ok) {
      const data: RefreshSubscriptionResponse = await response.json();
      return { ok: data };
    } else {
      return {
        err: `Unable to refresh subscription. Error: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(error);
    return { err: `Unable to refresh subscription. Error: ${error}` };
  }
}
