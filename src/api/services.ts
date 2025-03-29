import { routes } from "../firebaseConfig";
import { getToken } from "./auth";
import type { Model, ModelOption } from "@/types/llm";

// Types matching the backend response
export interface GetLLMsRow {
  name: string;
  description: string;
  version: string;
  provider: string;
  speed_level: string;
  intelligence_level: string;
  supports_tools: boolean;
  is_date_tagged: boolean;
  attachable_image_count: number;
  cost_per_million_input_tokens: number;
  cost_per_million_output_tokens: number;
  icon_url?: string; // Will be provided by the backend in future
}

export interface GetImageModelsRow {
  name: string;
  description: string;
  version: string;
  provider: string;
  speed_level: string;
  cost: number;
  icon_url?: string; // Will be provided by the backend in future
}

export interface ServicesResponse {
  llms: GetLLMsRow[];
  image_models: GetImageModelsRow[];
}

// Function to map backend service data to frontend model options
export function mapLLMToModelOption(llm: GetLLMsRow): ModelOption {
  const id = llm.is_date_tagged 
    ? `${llm.name}@${llm.version.replace(/\./g, "")}`
    : llm.name;
    
  // Determine if model is premium based on price
  // This is a simple heuristic - you might want to adjust based on your pricing strategy
  const isPremium = llm.cost_per_million_input_tokens > 3.0;
  
  // Map speed_level to appropriate frontend value
  let speedLevel: "slow" | "medium" | "fast" | "insane";
  switch (llm.speed_level.toLowerCase()) {
    case "very slow":
      speedLevel = "slow";
      break;
    case "slow":
      speedLevel = "slow";
      break;
    case "medium":
      speedLevel = "medium";
      break;
    case "fast":
      speedLevel = "fast";
      break;
    case "very fast":
      speedLevel = "insane";
      break;
    default:
      speedLevel = "medium";
  }
  
  return {
    id: id as Model,
    name: llm.is_date_tagged ? `${llm.name} (${llm.version})` : llm.name,
    vendor: llm.provider.toLowerCase() as any,
    isPremium,
    isTaggedModel: llm.is_date_tagged,
    speedLevel,
    iconUrl: llm.icon_url,
    supports: {
      imageAttachments: llm.attachable_image_count > 0 ? "single" : undefined,
      tools: llm.supports_tools,
    },
    pricing: {
      inputTokens: llm.cost_per_million_input_tokens,
      outputTokens: llm.cost_per_million_output_tokens,
      intelligenceLevel: llm.intelligence_level,
    }
  };
}

export function mapImageModelToModelOption(model: GetImageModelsRow): ModelOption {
  return {
    id: model.name as Model,
    name: model.name,
    vendor: model.provider.toLowerCase() as any, 
    isPremium: model.cost > 0.05, // Threshold for premium image models
    speedLevel: model.speed_level.toLowerCase() as any,
    iconUrl: model.icon_url,
    pricing: {
      costPerImage: model.cost,
    }
  };
}

/**
 * Fetches available services (LLM models and image generation models) from the backend
 */
export async function getServices(): Promise<{
  llms: ModelOption[];
  imageModels: ModelOption[];
} | { error: string }> {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return { error: "Unable to fetch services: Authentication error" };
  }
  if (!tok.ok) {
    return { error: "Unable to fetch services: Authentication error" };
  }

  try {
    const response = await fetch(routes.services, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tok.ok.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as ServicesResponse;
    
    return {
      llms: data.llms.map(mapLLMToModelOption),
      imageModels: data.image_models.map(mapImageModelToModelOption),
    };
  } catch (error) {
    console.error("Error fetching services:", error);
    return { error: "Failed to fetch services. Please try again later." };
  }
}