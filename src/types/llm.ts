export type ModelPreferences = {
  mainModel: Model
  programmerModel: Model
  imageGeneration: {
    model: Model
    size: { wh: string }
  }
  tools: ToolPreferences
  memory: MemoryPreferences
}

// TODO: use services.ts and useServices hook to check if the model supports image attachments
export function modelSupportsImageAttachments(model: Model): boolean {
  return (
    model === "gemini-1.5-pro" ||
    model === "gemini-1.5-flash" ||
    model === "claude-3-haiku" ||
    model === "claude-3-haiku@20240307" ||
    model === "claude-3-5-sonnet" ||
    model === "claude-3-5-sonnet@20240620" ||
    model === "claude-3-5-sonnet-v2" ||
    model === "claude-3-5-sonnet-v2@20241022" ||
    model === "meta/llama-3.3-70b-instruct-maas" ||
    model === "meta/llama-4-scout-17b-16e-instruct-maas" ||
    model === "meta/llama-4-maverick-17b-128e-instruct-maas" ||
    model === "gpt-4o" ||
    model === "gpt-4o-2024-11-20" ||
    model === "gpt-4o-mini" ||
    model === "gpt-4o-mini-2024-07-18" ||
    model === "mistral-small"
  )
}

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
  | "mistral-small"
  | "meta/llama-3.3-70b-instruct-maas"
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
  | "o1-mini-2024-09-12"
  | "llama3.1-8b"
  | "llama-3.3-70b"
  | "meta/llama-4-scout-17b-16e-instruct-maas"
  | "meta/llama-4-maverick-17b-128e-instruct-maas"

export type Vendor =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "meta"
  | "cerebras"

export type ImageGenerationSize = {
  wh: string
  description: string
  supportedModels: Model[]
}

export type ModelOption = {
  id: Model
  name: string
  minimumTier?: number
  isMaintenance?: boolean
  isTaggedModel?: boolean
  sizeOptions?: ImageGenerationSize[]
  vendor?: Vendor
  supports?: {
    imageAttachments?: "single" | "multiple"
    imageGeneration?: boolean
    tools?: boolean
  }
  speedLevel?: "slow" | "medium" | "fast" | "insane"
}

export type Tool = {
  id: keyof ToolPreferences
  name: string
  description: string
  trigger: string
}

export type ToolPreferences = {
  imageGeneration: boolean
  googleSearch: boolean
}

export type MemoryPreferences = {
  shortTermMemoryCount: number
  longTermMemoryChain: number[]
}
