export type ModelPreferences = {
  mainModel: Model;
  programmerModel: Model;
  imageGeneration: {
    model: Model;
    size: ImageGenerationSize;
  };
  tools: ToolPreferences;
};

export type Model =
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "claude-3-haiku"
  | "claude-3-haiku@20240307"
  | "claude-3-5-haiku"
  | "claude-3-5-haiku@20241022"
  | "claude-3-5-sonnet"
  | "claude-3-5-sonnet@20240620"
  | "claude-3-5-sonnet-v2"
  | "claude-3-5-sonnet-v2@20241022"
  | "mistral-nemo"
  | "mistral-large"
  | "llama-3-2"
  | "dall-e-2"
  | "dall-e-3"
  | "dall-e-3-hd"
  | "gpt-4o"
  | "gpt-4o-2024-11-20"
  | "gpt-4o-mini"
  | "gpt-4o-mini-2024-07-18"
  | "o1-preview"
  | "o1-preview-2024-09-12"
  | "o1-mini"
  | "o1-mini-2024-09-12";

export type Vendor = "openai" | "anthropic" | "google" | "mistral" | "meta";

export type ImageGenerationSize = {
  wh: string;
  description: string;
  supportedModels: Model[];
};

export type ModelOption = {
  id: Model;
  name: string;
  isPremium?: boolean;
  isFree?: boolean;
  isMaintenance?: boolean;
  sizeOptions?: ImageGenerationSize[];
  vendor?: Vendor;
  supports?: {
    imageAttachments?: boolean;
    imageGeneration?: boolean;
    tools?: boolean;
  };
};

export type Tool = {
  name: string;
  description: string;
  trigger: string;
};

export type ToolPreferences = {
  openScad: boolean;
  htmlScript: boolean;
  imageGeneration: boolean;
  googleSearch: boolean;
  googleHome: boolean;
};
