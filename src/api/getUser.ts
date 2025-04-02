import { Result } from "@/types/common";
import { BASE_URL } from "../firebaseConfig";
import { getToken } from "./auth";

export interface User {
  balance: number;
  email: string;
  subscriptionStatus:
    | "free"
    | "active"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "canceled"
    | "unpaid";
  cancelAtPeriodEnd: boolean;
  planTier: number;
  stripeCustomerID: string;
}

export async function getUser(): Promise<Result<User>> {
  const tok = await getToken();
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` };
  }
  if (!tok.ok) {
    return { err: "No token" };
  }

  const url = `${BASE_URL}/api/v2/users/${tok.ok.userID}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
    });

    if (response.ok) {
      const data: User = await response.json();
      return { ok: data };
    } else {
      return {
        err: `Unable to fetch user data. Error: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(error);
    return { err: `Unable to fetch user data. Error: ${error}` };
  }
}
