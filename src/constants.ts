export type Model =
    "gemini-1.5-pro" |
    "gemini-1.5-flash" |
    "claude-3-5-sonnet" |
    "mistral-nemo" |
    "llama-3-2";

export interface ModelOption {
    id: Model;
    name: string;
    isPremium: boolean;
    isFree?: boolean;
    isMaintenance?: boolean;
}

export const DEFAULT_MODELS: ModelOption[] = [
    { id: "llama-3-2", name: "Llama 3.2", isPremium: false, isFree: true },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isPremium: false },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isPremium: true },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', isPremium: true, isMaintenance: true },
    { id: 'mistral-nemo', name: 'Mistral Nemo', isPremium: false },
] as const;
