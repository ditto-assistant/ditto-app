import { z } from "zod"
import { Result } from "@/types/common"
import { BASE_URL } from "../firebaseConfig"
import { getToken } from "./auth"
import { Model } from "@/types/llm"

// Define the preferred models schema
const PreferredModelsSchema = z.object({
  mainModel: z.string() as z.ZodType<Model>,
  programmerModel: z.string() as z.ZodType<Model>,
  imageModel: z.string() as z.ZodType<Model>,
  imageModelSize: z.string(),
})

// Define the tools preferences schema
const ToolPreferencesSchema = z.object({
  htmlScript: z.boolean(),
  imageGeneration: z.boolean(),
  googleSearch: z.boolean(),
})

// Define the memory preferences schema
const MemoryPreferencesSchema = z.object({
  shortTermMemoryCount: z.number(),
  longTermMemoryChain: z.array(z.number()),
})

// Define the preferences schema
const UserPreferencesSchema = z.object({
  preferredModels: PreferredModelsSchema,
  theme: z.enum(["light", "dark", "system"]),
  tools: ToolPreferencesSchema,
  memory: MemoryPreferencesSchema,
})

// Define the user schema with the new preferences structure
export const UserSchema = z.object({
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
  preferences: UserPreferencesSchema,
})

export type UserPreferences = z.infer<typeof UserPreferencesSchema>
export type PreferredModels = z.infer<typeof PreferredModelsSchema>
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
