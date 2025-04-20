import { z } from "zod"
import { Result } from "@/types/common"
import { BASE_URL } from "../firebaseConfig"
import { getToken } from "./auth"
import { Model } from "@/types/llm"

const UserSchema = z.object({
  balance: z.number(),
  email: z.string().optional(),
  subscriptionStatus: z.enum([
    "free",
    "active",
    "incomplete",
    "incomplete_expired",
    "past_due",
    "canceled",
    "unpaid",
  ]),
  currentPeriodEnd: z.coerce.date().optional(),
  cancelAtPeriodEnd: z.boolean(),
  trialEnd: z.coerce.date().optional(),
  planTier: z.number(),
  stripeCustomerID: z.string().optional(),
  isTierBoostedFromBalance: z.boolean().optional(),
  // New preference fields
  preferredMainModel: z.string() as z.ZodType<Model>,
  preferredProgrammerModel: z.string() as z.ZodType<Model>,
  preferredImageModel: z.string() as z.ZodType<Model>,
  theme: z.enum(["light", "dark", "system"]),
})

export type User = z.infer<typeof UserSchema>

export async function getUser(): Promise<Result<User>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: `Unable to get token: ${tok.err}` }
  }
  if (!tok.ok) {
    return { err: "No token" }
  }

  const url = `${BASE_URL}/api/v2/users/${tok.ok.userID}`
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
    })

    if (response.ok) {
      const rawData: unknown = await response.json()
      const result = UserSchema.safeParse(rawData)
      if (result.success) {
        return { ok: result.data }
      } else {
        console.error("Zod validation error:", result.error.flatten())
        return {
          err: `Invalid user data received from API. Error: ${result.error.message}`,
        }
      }
    } else {
      return {
        err: `Unable to fetch user data. Error: ${response.status}`,
      }
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return { err: `Unable to fetch user data. Error: ${error}` }
  }
}
