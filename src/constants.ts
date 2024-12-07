import {
  ModelOption,
  Model,
  ModelPreferences,
  ImageGenerationSize,
  ToolPreferences,
} from "./types/llm";

export const USER_PLACEHOLDER_IMAGE = "user_placeholder.png";
export const IMAGE_PLACEHOLDER_IMAGE = "image-placeholder.png";
export const NOT_FOUND_IMAGE = "not-found.png";

// TODO: The backend should return the list of available models
export const DEFAULT_MODELS: ModelOption[] = [
  { id: "llama-3-2", name: "Llama 3.2", isFree: true, vendor: "meta" },

  { id: "gpt-4o-mini", name: "GPT-4o Mini", vendor: "openai" },
  {
    id: "gpt-4o-mini-2024-07-18",
    name: "GPT-4o Mini 2024-07-18",
    vendor: "openai",
  },
  { id: "gpt-4o", name: "GPT-4o", isPremium: true, vendor: "openai" },
  {
    id: "gpt-4o-2024-11-20",
    name: "GPT-4o 2024-11-20",
    isPremium: true,
    vendor: "openai",
  },
  { id: "o1-mini", name: "O1 Mini", vendor: "openai" },
  { id: "o1-mini-2024-09-12", name: "O1 Mini 2024-09-12", vendor: "openai" },
  { id: "o1-preview", name: "O1 Preview", vendor: "openai" },
  {
    id: "o1-preview-2024-09-12",
    name: "O1 Preview 2024-09-12",
    vendor: "openai",
  },

  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", vendor: "google" },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    isPremium: true,
    vendor: "google",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    isPremium: true,
    vendor: "anthropic",
  },
  { id: "mistral-nemo", name: "Mistral Nemo", vendor: "mistral" },
  {
    id: "mistral-large",
    name: "Mistral Large",
    isPremium: true,
    vendor: "mistral",
  },
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

export const DEFAULT_TOOL_PREFERENCES: ToolPreferences = {
  openScad: false,
  htmlScript: true,
  imageGeneration: true,
  googleSearch: true,
  googleHome: false,
};

export const DEFAULT_PREFERENCES: ModelPreferences = {
  mainModel: "llama-3-2",
  programmerModel: "mistral-nemo",
  imageGeneration: {
    model: "dall-e-3",
    size: {
      wh: "1024x1024",
      description: "Square (1024x1024)",
      supportedModels: ["dall-e-2", "dall-e-3"],
    },
  },
  tools: DEFAULT_TOOL_PREFERENCES,
};

export const TOOLS = {
  imageGeneration: {
    name: "Image Generation",
    description: "Generate images based on text descriptions",
    trigger: "<IMAGE_GENERATION>",
  },
  googleSearch: {
    name: "Web Search",
    description: "Search the web for information",
    trigger: "<GOOGLE_SEARCH>",
  },
  googleHome: {
    name: "Home Assistant",
    description: "Control smart home devices",
    trigger: "<GOOGLE_HOME>",
  },
  webApps: {
    name: "Web Apps",
    description: "Generate web applications using HTML, CSS, and JavaScript",
    trigger: "<HTML_SCRIPT>",
  },
  openScad: {
    name: "OpenSCAD",
    description: "Generate 3D modeling scripts using OpenSCAD",
    trigger: "<OPENSCAD>",
  },
} as const;
