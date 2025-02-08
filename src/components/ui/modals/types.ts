export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  showCloseButton?: boolean;
  className?: string;
}

export interface ConfirmationModalProps
  extends Omit<BaseModalProps, "children" | "title"> {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export interface ModelPreference {
  id: string;
  name: string;
  vendor: "google" | "openai" | "anthropic" | "mistral" | "meta" | "cerebras";
  speed: "slow" | "medium" | "fast" | "insane";
  pricing: "free" | "premium";
  hasImageSupport: boolean;
}

export interface MemoryStatus {
  longTerm: boolean;
  shortTerm: boolean;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

export type ModelFilter = {
  speed: "slow" | "medium" | "fast" | "insane" | null;
  pricing: "free" | "premium" | null;
  imageSupport: boolean;
  vendor: string | null;
};
