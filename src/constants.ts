import {
  ModelOption,
  Model,
  ModelPreferences,
  ImageGenerationSize,
  ToolPreferences,
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

export const DEFAULT_TOOL_PREFERENCES: ToolPreferences = {
  openScad: false,
  htmlScript: true,
  imageGeneration: true,
  googleSearch: true,
  googleHome: false,
};

export const DEFAULT_PREFERENCES: ModelPreferences = {
  mainModel: "gemini-1.5-pro",
  programmerModel: "gemini-1.5-pro",
  imageGeneration: {
    model: "dall-e-3",
    size: "1024x1024",
  },
  tools: DEFAULT_TOOL_PREFERENCES,
};

export const TOOLS = {
  imageGeneration: {
<<<<<<< HEAD
    name: 'Image Generation',
    description: 'Generate images based on text descriptions',
    trigger: '<IMAGE_GENERATION>'
  },
  googleSearch: {
    name: 'Web Search',
    description: 'Search the web for information',
    trigger: '<GOOGLE_SEARCH>'
  },
  googleHome: {
    name: 'Home Assistant',
    description: 'Control smart home devices',
    trigger: '<GOOGLE_HOME>'
  },
  webApps: {
    name: 'Web Apps',
    description: 'Generate web applications using HTML, CSS, and JavaScript',
    trigger: '<HTML_SCRIPT>'
  },
  openScad: {
    name: 'OpenSCAD',
    description: 'Generate 3D modeling scripts using OpenSCAD',
    trigger: '<OPENSCAD>'
  }
=======
    name: "Image Generation",
    description: "Generate images based on text descriptions",
    trigger: "<IMAGE_GENERATION> query",
  },
  googleSearch: {
    name: "Google Search",
    description: "Search the web for information",
    trigger: "<GOOGLE_SEARCH> query",
  },
  googleHome: {
    name: "Google Home",
    description: "Control smart home devices",
    trigger: "<GOOGLE_HOME> query",
  },
  webApps: {
    name: "Web Apps",
    description: "Generate web applications using HTML, CSS, and JavaScript",
    trigger: "<HTML_SCRIPT> query",
  },
  openScad: {
    name: "OpenSCAD",
    description: "Generate 3D modeling scripts using OpenSCAD",
    trigger: "<OPENSCAD> query",
  },
>>>>>>> 86a16ed34e47d7a158d14506f4284001a02c5b54
} as const;

export type Tool = {
  name: string;
  description: string;
  trigger: string;
};
