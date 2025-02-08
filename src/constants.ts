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
  {
    id: "llama-3-2",
    name: "Llama 3.2",
    isFree: true,
    vendor: "meta",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "medium",
  },

  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    vendor: "openai",
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
    isPremium: true,
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
    isPremium: true,
    vendor: "openai",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: true,
    speedLevel: "medium",
  },

  // {
  //   id: "claude-3-haiku",
  //   name: "Claude 3 Haiku",
  //   vendor: "anthropic",
  // },
  {
    id: "claude-3-haiku@20240307",
    name: "Claude 3 Haiku 2024-03-07",
    vendor: "anthropic",
    isTaggedModel: true,
    speedLevel: "medium",
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    vendor: "anthropic",
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
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    isTaggedModel: true,
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    isPremium: true,
    vendor: "anthropic",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "medium",
  },
  {
    id: "claude-3-5-sonnet@20240620",
    name: "Claude 3.5 Sonnet (2024-06-20)",
    isPremium: true,
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
    name: "Claude 3.5 Sonnet V2",
    isPremium: true,
    vendor: "anthropic",
    supports: {
      imageAttachments: "single",
      tools: true,
    },
  },
  {
    id: "claude-3-5-sonnet-v2@20241022",
    name: "Claude 3.5 Sonnet V2 (2024-10-22)",
    isPremium: true,
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
    supports: {
      imageAttachments: "single",
      tools: true,
    },
    speedLevel: "fast",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    isPremium: true,
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
    supports: {
      tools: true,
    },
    speedLevel: "fast",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    isPremium: true,
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
    name: "Llama 3.1 8B",
    vendor: "cerebras",
    supports: {
      tools: true,
    },
    speedLevel: "insane",
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    vendor: "cerebras",
    isPremium: true,
    supports: {
      tools: true,
    },
    speedLevel: "insane",
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

export const DEFAULT_TOOL_PREFERENCES: ToolPreferences = {
  openScad: false,
  htmlScript: true,
  imageGeneration: true,
  googleSearch: true,
  googleHome: false,
} as const;

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
  memory: {
    shortTermMemoryCount: 5,
    longTermMemoryChain: [5],
  },
} as const;

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

export interface MemoryPreferences {
  shortTermMemoryCount: number;
  longTermMemoryChain: number[];
}

export const DEFAULT_MEMORY_PREFERENCES: MemoryPreferences = {
  shortTermMemoryCount: 5,
  longTermMemoryChain: [5],
};

export const MEMORY_CONFIG = {
  shortTerm: {
    min: 0,
    max: 20,
    step: 1,
    marks: [
      { value: 0, label: "0" },
      { value: 5, label: "5" },
      { value: 10, label: "10" },
      { value: 20, label: "20" },
    ],
  },
  longTerm: {
    min: 0,
    max: 10,
    step: 1,
    marks: [
      { value: 0, label: "0" },
      { value: 5, label: "5" },
      { value: 10, label: "10" },
    ],
    maxChainLength: 3,
  },
} as const;
