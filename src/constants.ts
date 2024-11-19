import {
  ModelOption,
  Model,
  ModelPreferences,
  ImageGenerationSize,
} from "./types";

// TODO: The backend should return the list of available models
export const DEFAULT_MODELS: ModelOption[] = [
  { id: "llama-3-2", name: "Llama 3.2", isPremium: false, isFree: true },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", isPremium: false },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", isPremium: true },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    isPremium: true,
    isMaintenance: true,
  },
  { id: "mistral-nemo", name: "Mistral Nemo", isPremium: false },
  { id: "mistral-large", name: "Mistral Large", isPremium: true },
] as const;

export const IMAGE_GENERATION_SIZES: Record<string, ImageGenerationSize> = {
  "256x256": {
    wh: "256x256",
    description: "Square (256x256)",
    supportedModels: ["dall-e-2"],
  },
  "512x512": {
    wh: "512x512",
    description: "Square (512x512)",
    supportedModels: ["dall-e-2"],
  },
  "1024x1024": {
    wh: "1024x1024",
    description: "Square (1024x1024)",
    supportedModels: ["dall-e-2", "dall-e-3"],
  },
  "1792x1024": {
    wh: "1792x1024",
    description: "Landscape (1792x1024)",
    supportedModels: ["dall-e-3"],
  },
  "1024x1792": {
    wh: "1024x1792",
    description: "Portrait (1024x1792)",
    supportedModels: ["dall-e-3"],
  },
} as const;

export const IMAGE_GENERATION_MODELS: ModelOption[] = [
  {
    id: "dall-e-2",
    name: "DALL-E 2",
    isPremium: true,
    sizeOptions: Object.values(IMAGE_GENERATION_SIZES).filter((size) =>
      size.supportedModels.includes("dall-e-2")
    ),
  },
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    isPremium: true,
    sizeOptions: Object.values(IMAGE_GENERATION_SIZES).filter((size) =>
      size.supportedModels.includes("dall-e-3")
    ),
  },
  {
    id: "dall-e-3-hd",
    name: "DALL-E 3 HD",
    isPremium: true,
    sizeOptions: Object.values(IMAGE_GENERATION_SIZES).filter((size) =>
      size.supportedModels.includes("dall-e-3")
    ),
  },
] as const;

export function isPremiumModel(model: Model): boolean {
  return ["claude-3-5-sonnet", "gemini-1.5-pro", "mistral-large"].includes(
    model
  );
}

export const DEFAULT_PREFERENCES: ModelPreferences = {
  mainModel: "llama-3-2",
  programmerModel: "llama-3-2",
  imageGeneration: {
    model: "dall-e-3",
    size: IMAGE_GENERATION_SIZES["1024x1024"],
  },
};
