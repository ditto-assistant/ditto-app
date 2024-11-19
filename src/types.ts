export type ModelPreferences = {
  mainModel: Model;
  programmerModel: Model;
  imageGeneration: {
    model: Model;
    size: ImageGenerationSize;
  };
};

export type Model =
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "claude-3-5-sonnet"
  | "mistral-nemo"
  | "mistral-large"
  | "llama-3-2"
  | "dall-e-2"
  | "dall-e-3"
  | "dall-e-3-hd";

export type ImageGenerationSize = {
  wh: string;
  description: string;
  supportedModels: Model[];
};

export interface ModelOption {
  id: Model;
  name: string;
  isPremium: boolean;
  isFree?: boolean;
  isMaintenance?: boolean;
  sizeOptions?: ImageGenerationSize[];
}
