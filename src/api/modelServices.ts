import { getToken } from "@/api/auth"
import { Result } from "@/types/common"
import { BASE_URL } from "@/firebaseConfig"
import { z } from "zod"
import { Model } from "@/types/llm"

// Schema for LLM model capabilities
const LLMModelSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  version: z.string(),
  provider: z.string(),
  modelFamily: z.string(),
  modelFamilyDisplayName: z.string(),
  modelFlavor: z.string(),
  speedLevel: z.number(),
  intelligenceLevel: z.number(),
  creativityLevel: z.number(),
  staminaLevel: z.number(),
  characterClass: z.string(),
  personality: z.string(),
  specialAbility: z.string(),
  strengths: z.string(),
  weaknesses: z.string(),
  avatarStyle: z.string(),
  supportsTools: z.boolean(),
  isDateTagged: z.boolean(),
  isDisabled: z.boolean().optional(),
  attachableImageCount: z.number(),
  minimumTier: z.number().optional().default(0),
  costPerMillionInputTokens: z.number(),
  costPerMillionOutputTokens: z.number(),
})

// Schema for image model capabilities
const ImageModelSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  version: z.string(),
  provider: z.string(),
  modelFamily: z.string(),
  modelFamilyDisplayName: z.string(),
  modelFlavor: z.string(),
  imageSize: z.string(),
  imageOrientation: z.string(),
  speedLevel: z.number(),
  intelligenceLevel: z.number(),
  isDateTagged: z.boolean(),
  isDisabled: z.boolean().optional(),
  creativityLevel: z.number(),
  staminaLevel: z.number(),
  characterClass: z.string(),
  personality: z.string(),
  specialAbility: z.string(),
  strengths: z.string(),
  weaknesses: z.string(),
  avatarStyle: z.string(),
  minimumTier: z.number().optional().default(0),
  cost: z.number(),
})

export type LLMModel = z.infer<typeof LLMModelSchema>
export type ImageModel = z.infer<typeof ImageModelSchema>

/**
 * Fetches a specific LLM model by ID
 */
export async function getLLMModel(modelId: Model): Promise<Result<LLMModel>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: tok.err.message }
  }
  if (!tok.ok) {
    return { err: "getLLMModel: Unable to fetch model: No token" }
  }

  try {
    const response = await fetch(
      `${BASE_URL}/api/v2/services/prompt/${encodeURIComponent(modelId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tok.ok.token}`,
          Accept: "application/json",
        },
      }
    )

    if (response.ok) {
      const rawData: unknown = await response.json()
      const result = LLMModelSchema.safeParse(rawData)

      if (result.success) {
        return { ok: result.data }
      } else {
        console.error("Zod validation error:", result.error.flatten())
        return {
          err: `getLLMModel: Invalid data received. Error: ${result.error.message}`,
        }
      }
    } else {
      return {
        err: `getLLMModel: Unable to fetch model: ${response.status}`,
      }
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return { err: `getLLMModel: Network error: ${error}` }
  }
}

/**
 * Fetches a specific image model by ID
 */
export async function getImageModel(
  modelId: Model
): Promise<Result<ImageModel>> {
  const tok = await getToken()
  if (tok.err) {
    return { err: tok.err.message }
  }
  if (!tok.ok) {
    return { err: "getImageModel: Unable to fetch model: No token" }
  }

  try {
    const response = await fetch(
      `${BASE_URL}/api/v2/services/image/${encodeURIComponent(modelId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tok.ok.token}`,
          Accept: "application/json",
        },
      }
    )

    if (response.ok) {
      const rawData: unknown = await response.json()
      const result = ImageModelSchema.safeParse(rawData)

      if (result.success) {
        return { ok: result.data }
      } else {
        console.error("Zod validation error:", result.error.flatten())
        return {
          err: `getImageModel: Invalid data received. Error: ${result.error.message}`,
        }
      }
    } else {
      return {
        err: `getImageModel: Unable to fetch model: ${response.status}`,
      }
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return { err: `getImageModel: Network error: ${error}` }
  }
}
