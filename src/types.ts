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
  | "dalle-2"
  | "dalle-3"
  | "dalle-3-hd";

export type ImageGenerationSize =
  | "256x256" // Dalle-2 Only
  | "512x512" // Dalle-2 Only
  | "1024x1024" // Dalle-2 and 3
  | "1792x1024" // Dalle-3 Only
  | "1024x1792"; // Dalle-3 Only

export interface ModelOption {
  id: Model;
  name: string;
  isPremium: boolean;
  isFree?: boolean;
  isMaintenance?: boolean;
  sizeOptions?: ImageGenerationSize[];
}
