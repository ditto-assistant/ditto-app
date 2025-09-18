import { z } from "zod"
import { Result } from "@/types/common"
import { BASE_URL } from "@/firebaseConfig"
import { getToken } from "@/api/auth"
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
  imageGeneration: z.boolean(),
  googleSearch: z.boolean(),
  readLinks: z.boolean(),
})

// Define the memory preferences schema
const MemoryPreferencesSchema = z.object({
  shortTermMemoryCount: z.number(),
  longTermMemoryChain: z.array(z.number()),
})

// Define the speech preferences schema
const SpeechPreferencesSchema = z.object({
  // Text-to-Speech settings
  enableReadback: z.boolean().default(false), // Global toggle for TTS readback
  voiceLanguage: z.string().default("en-US"), // Voice language/locale
  voiceRate: z.number().min(0.1).max(10).default(1), // Speech rate (0.1 to 10)
  voicePitch: z.number().min(0).max(2).default(1), // Voice pitch (0 to 2)
  voiceVolume: z.number().min(0).max(1).default(1), // Voice volume (0 to 1)
  voiceName: z.string().optional(), // Specific voice name if selected
})

// Define the preferences schema
const UserPreferencesSchema = z.object({
  preferredModels: PreferredModelsSchema,
  theme: z.enum(["light", "dark", "system"]),
  tools: ToolPreferencesSchema,
  memory: MemoryPreferencesSchema,
  speech: SpeechPreferencesSchema.default({}), // Add speech preferences with defaults
})

// Define the user schema with the new preferences structure
export const UserSchema = z.object({
  balance: z.number(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
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
export type ToolPreferences = z.infer<typeof ToolPreferencesSchema>
export type MemoryPreferences = z.infer<typeof MemoryPreferencesSchema>
export type SpeechPreferences = z.infer<typeof SpeechPreferencesSchema>
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
