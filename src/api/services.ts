import { getToken } from "@/api/auth";
import { Result } from "@/types/common";
import { BASE_URL } from "@/firebaseConfig";
import { z } from "zod";

// Common schema for pagination
const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemsSchema: T) =>
  z.object({
    items: z.array(itemsSchema),
    page: z.number(),
    nextPage: z.number(),
    pageSize: z.number(),
  });

// Base schema for common model capabilities (shared between image and LLM models)
const BaseModelCapabilitiesSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  version: z.string(),
  provider: z.string(),
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
});

// Schema for image model capabilities
const ImageModelSchema = BaseModelCapabilitiesSchema.extend({
  minimumTier: z.number().optional().default(0),
  cost: z.number(),
});

// Schema for LLM model capabilities with additional fields
const LLMModelSchema = BaseModelCapabilitiesSchema.extend({
  minimumTier: z.number().optional().default(0),
  supportsTools: z.boolean(),
  isDateTagged: z.boolean(),
  attachableImageCount: z.number(),
  costPerMillionInputTokens: z.number(),
  costPerMillionOutputTokens: z.number(),
});

export type ImageModel = z.infer<typeof ImageModelSchema>;
export type LLMModel = z.infer<typeof LLMModelSchema>;
export type PaginatedImageModels = z.infer<
  ReturnType<typeof PaginatedResponseSchema<typeof ImageModelSchema>>
>;
export type PaginatedLLMModels = z.infer<
  ReturnType<typeof PaginatedResponseSchema<typeof LLMModelSchema>>
>;

// Request parameters schema for pagination
export const PageParamsSchema = z.object({
  page: z.number().optional().default(0),
  pageSize: z.number().optional().default(10),
});

export type PageParams = z.infer<typeof PageParamsSchema>;

/**
 * Fetches available prompt (LLM) models with pagination support
 */
export async function getPromptModels(
  params: PageParams = { page: 1, pageSize: 50 },
): Promise<Result<PaginatedLLMModels>> {
  const tok = await getToken();
  if (tok.err) {
    return { err: tok.err.message };
  }
  if (!tok.ok) {
    return { err: "getPromptModels: Unable to fetch models: No token" };
  }

  try {
    // Validate and parse input parameters
    const validParams = PageParamsSchema.parse(params);

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: validParams.page.toString(),
      pageSize: validParams.pageSize.toString(),
    });

    const response = await fetch(
      `${BASE_URL}/api/v2/services/prompt?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tok.ok.token}`,
          Accept: "application/json",
        },
      },
    );

    if (response.ok) {
      const rawData: unknown = await response.json();
      const schema = PaginatedResponseSchema(LLMModelSchema);
      const result = schema.safeParse(rawData);

      if (result.success) {
        return { ok: result.data };
      } else {
        console.error("Zod validation error:", result.error.flatten());
        return {
          err: `getPromptModels: Invalid data received. Error: ${result.error.message}`,
        };
      }
    } else {
      return {
        err: `getPromptModels: Unable to fetch models: ${response.status}`,
      };
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return { err: `getPromptModels: Network error: ${error}` };
  }
}

/**
 * Fetches available image generation models with pagination support
 */
export async function getImageModels(
  params: PageParams = { page: 1, pageSize: 50 },
): Promise<Result<PaginatedImageModels>> {
  const tok = await getToken();
  if (tok.err) {
    return { err: tok.err.message };
  }
  if (!tok.ok) {
    return { err: "getImageModels: Unable to fetch models: No token" };
  }

  try {
    // Validate and parse input parameters
    const validParams = PageParamsSchema.parse(params);

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: validParams.page.toString(),
      pageSize: validParams.pageSize.toString(),
    });

    const response = await fetch(
      `${BASE_URL}/api/v2/services/image?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tok.ok.token}`,
          Accept: "application/json",
        },
      },
    );

    if (response.ok) {
      const rawData: unknown = await response.json();
      const schema = PaginatedResponseSchema(ImageModelSchema);
      const result = schema.safeParse(rawData);

      if (result.success) {
        return { ok: result.data };
      } else {
        console.error("Zod validation error:", result.error.flatten());
        return {
          err: `getImageModels: Invalid data received. Error: ${result.error.message}`,
        };
      }
    } else {
      return {
        err: `getImageModels: Unable to fetch models: ${response.status}`,
      };
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return { err: `getImageModels: Network error: ${error}` };
  }
}
