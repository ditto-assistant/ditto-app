import { ModelOption, Model, ModelPreferences } from "./types";

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

export const IMAGE_GENERATION_MODELS: ModelOption[] = [
  {
    id: "dalle-2",
    name: "DALL-E 2",
    isPremium: true,
    sizeOptions: ["256x256", "512x512", "1024x1024"],
  },
  {
    id: "dalle-3",
    name: "DALL-E 3",
    isPremium: true,
    sizeOptions: ["1024x1024", "1792x1024", "1024x1792"],
  },
  {
    id: "dalle-3-hd",
    name: "DALL-E 3 HD",
    isPremium: true,
    sizeOptions: ["1024x1024", "1792x1024", "1024x1792"],
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
    model: "dalle-3",
    size: "1024x1024",
  },
};
