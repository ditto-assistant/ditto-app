import {
  ModelOption,
  ModelPreferences,
  ImageGenerationSize,
  ToolPreferences,
  Model,
} from "@/types/llm"

export const IMAGE_PLACEHOLDER_IMAGE = "/placeholders/image-loading-192.png"
export const DITTO_LOGO = "/icons/round/android-chrome-192x192.png"
export const BRAND_TEXT = "Hey Ditto"
export const DITTO_AVATAR = "/icons/round/ditto-avatar-192x192.png"
export const DEFAULT_USER_AVATAR = "/icons/round/user-avatar-192x192.png"
export const NOT_FOUND_IMAGE = "/placeholders/not-found-192.png"
export const FREE_MODEL_ID: Model =
  "meta/llama-4-maverick-17b-128e-instruct-maas"

// TODO: The backend should return the list of available models
export const DEFAULT_MODELS: ModelOption[] = [
  {
    id: "meta/llama-3.3-70b-instruct-maas",
    name: "Llama 3.3 70B",
    vendor: "meta",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "medium",
    isFree: true,
  },
  {
    id: "meta/llama-4-maverick-17b-128e-instruct-maas",
    name: "Llama 4 Maverick",
    vendor: "meta",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "medium",
    isFree: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    vendor: "openai",
    minimumTier: 1,
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "fast",
  },
  {
    id: "gpt-4o-mini-2024-07-18",
    name: "GPT-4o Mini (2024-07-18)",
    vendor: "openai",
    minimumTier: 1,
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: true,
    speedLevel: "fast",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    minimumTier: 2,
    vendor: "openai",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "medium",
  },
  {
    id: "gpt-4o-2024-11-20",
    name: "GPT-4o (2024-11-20)",
    minimumTier: 2,
    vendor: "openai",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: true,
    speedLevel: "medium",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    minimumTier: 0,
    vendor: "openai",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: false,
    speedLevel: "medium",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    minimumTier: 0,
    vendor: "openai",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: false,
    speedLevel: "medium",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    minimumTier: 2,
    vendor: "openai",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: false,
    speedLevel: "medium",
  },
  // {
  //   id: "claude-3-haiku",
  //   name: "Claude 3 Haiku",
  //   vendor: "anthropic",
  //   supports: {
  //     imageAttachments: "single",
  //     tools: true,
  //   },
  //   speedLevel: "fast",
  // },
  {
    id: "claude-3-haiku@20240307",
    name: "Claude 3 Haiku 2024-03-07",
    vendor: "anthropic",
    minimumTier: 1,
    isTaggedModel: true,
    speedLevel: "medium",
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    vendor: "anthropic",
    minimumTier: 1,
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "fast",
  },
  {
    id: "claude-3-5-haiku@20241022",
    name: "Claude 3.5 Haiku (2024-10-22)",
    vendor: "anthropic",
    minimumTier: 1,
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: true,
  },
  {
    id: "claude-3-5-sonnet@20240620",
    name: "Claude 3.5 Sonnet (2024-06-20)",
    minimumTier: 2,
    vendor: "anthropic",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: true,
    speedLevel: "medium",
  },
  {
    id: "claude-3-5-sonnet-v2",
    name: "Claude 3.5 Sonnet",
    minimumTier: 2,
    vendor: "anthropic",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "medium",
  },
  {
    id: "claude-3-5-sonnet-v2@20241022",
    name: "Claude 3.5 Sonnet V2 (2024-10-22)",
    minimumTier: 2,
    vendor: "anthropic",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: true,
    speedLevel: "medium",
  },

  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    vendor: "google",
    minimumTier: 1,
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "fast",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    minimumTier: 2,
    vendor: "google",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "medium",
  },

  {
    id: "mistral-nemo",
    name: "Mistral Nemo",
    vendor: "mistral",
    minimumTier: 1,
    supports: {
      tools: true,
    },
    speedLevel: "fast",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    minimumTier: 2,
    vendor: "mistral",
    supports: {
      tools: true,
    },
    speedLevel: "slow",
  },

  // { id: "o1-mini", name: "o1 Mini", vendor: "openai", isPremium: true },
  // {
  //   id: "o1-mini-2024-09-12",
  //   name: "o1 Mini (2024-09-12)",
  //   vendor: "openai",
  //   isPremium: true,
  // },
  // { id: "o1-preview", name: "o1 Preview", vendor: "openai", isPremium: true },
  // {
  //   id: "o1-preview-2024-09-12",
  //   name: "o1 Preview (2024-09-12)",
  //   vendor: "openai",
  //   isPremium: true,
  // },
  {
    id: "llama3.1-8b",
    name: "Fast Llama 3.1 8B",
    vendor: "cerebras",
    minimumTier: 1,
    supports: {
      tools: true,
    },
    speedLevel: "insane",
  },
  {
    id: "llama-3.3-70b",
    name: "Fast Llama 3.3 70B",
    vendor: "cerebras",
    minimumTier: 1,
    supports: {
      tools: true,
    },
    speedLevel: "insane",
  },
] as const

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
} as const

export const IMAGE_GENERATION_MODELS: ModelOption[] = [
  {
    id: "dall-e-2",
    name: "DALL-E 2",
    minimumTier: 1,
    sizeOptions: Object.values(IMAGE_GENERATION_SIZES).filter((size) =>
      size.supportedModels.includes("dall-e-2")
    ),
  },
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    minimumTier: 1,
    sizeOptions: Object.values(IMAGE_GENERATION_SIZES).filter((size) =>
      size.supportedModels.includes("dall-e-3")
    ),
  },
  {
    id: "dall-e-3-hd",
    name: "DALL-E 3 HD",
    minimumTier: 3,
    sizeOptions: Object.values(IMAGE_GENERATION_SIZES).filter((size) =>
      size.supportedModels.includes("dall-e-3")
    ),
  },
] as const

export const DEFAULT_TOOL_PREFERENCES: ToolPreferences = {
  imageGeneration: true,
  googleSearch: true,
} as const

export const DEFAULT_PREFERENCES: ModelPreferences = {
  mainModel: "meta/llama-3.3-70b-instruct-maas",
  programmerModel: "mistral-nemo",
  imageGeneration: {
    model: "dall-e-3",
    size: {
      wh: "1024x1024",
    },
  },
  tools: DEFAULT_TOOL_PREFERENCES,
  memory: {
    shortTermMemoryCount: 5,
    longTermMemoryChain: [3, 2, 1],
  },
} as const

export const TOOLS = [
  {
    id: "imageGeneration",
    name: "Image Generation",
    description: "Generate images based on text descriptions",
    trigger: "<IMAGE_GENERATION>",
  },
  {
    id: "googleSearch",
    name: "Web Search",
    description: "Search the web for information",
    trigger: "<GOOGLE_SEARCH>",
  },
] as const

export const MEMORY_CONFIG = {
  shortTerm: {
    min: 0,
    max: 10,
    step: 1,
    marks: [
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 3, label: "3" },
      { value: 5, label: "5" },
      { value: 7, label: "7" },
      { value: 9, label: "9" },
      { value: 10, label: "10" },
    ],
  },
  longTerm: {
    min: 0,
    max: 5,
    step: 1,
    marks: [
      { value: 0, label: "0" },
      { value: 1, label: "1" },
      { value: 3, label: "3" },
      { value: 5, label: "5" },
    ],
    maxChainLength: 5,
  },
} as const
