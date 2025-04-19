import { Result } from "@/types/common"
import { BASE_URL } from "../firebaseConfig"
import { getToken } from "./auth"

export interface SubscriptionPrice {
  lookupKey: string
  amount: number
  currency: string
  interval: "month" | "year"
}

export interface SubscriptionTier {
  name: string
  description: string
  features: string[]
  prices: SubscriptionPrice[]
  mostPopular: boolean
  planTier: number
}

export interface SubscriptionResponse {
  tiers: SubscriptionTier[]
}

export async function getSubscriptionTiers(): Promise<
  Result<SubscriptionResponse>
> {
  const tok = await getToken()
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }

  try {
    const response = await fetch(`${BASE_URL}/api/v2/subscriptions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`
      }
    })

    if (response.ok) {
      const data: SubscriptionResponse = await response.json()
      return { ok: data }
    } else {
      return {
        err: `Unable to fetch subscription tiers. Error: ${response.status}`
      }
    }
  } catch (error) {
    console.error(error)
    return { err: `Unable to fetch subscription tiers. Error: ${error}` }
  }
}
