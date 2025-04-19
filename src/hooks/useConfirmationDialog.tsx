import { ReactNode, createContext, useContext, useState } from "react"
import { useModal } from "./useModal"

interface ConfirmationDialogConfig {
  title: string
  content: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
  variant?: "primary" | "secondary" | "danger" | "ghost"
}

interface ConfirmationDialogContextType {
  config: ConfirmationDialogConfig | null
  setConfig: (config: ConfirmationDialogConfig | null) => void
}

const ConfirmationDialogContext = createContext<
  ConfirmationDialogContextType | undefined
>(undefined)

export function ConfirmationDialogProvider({
  children,
}: {
  children: ReactNode
}) {
  const [config, setConfig] = useState<ConfirmationDialogConfig | null>(null)

  return (
    <ConfirmationDialogContext.Provider
      value={{
        config,
        setConfig,
      }}
    >
      {children}
    </ConfirmationDialogContext.Provider>
  )
}

export function useConfirmationDialog() {
  const context = useContext(ConfirmationDialogContext)

  if (context === undefined) {
    throw new Error(
      "useConfirmationDialog must be used within a ConfirmationDialogProvider"
    )
  }

  const { createOpenHandler, createCloseHandler } = useModal()
  const openModal = createOpenHandler("confirmationDialog")
  const closeModal = createCloseHandler("confirmationDialog")

  const showConfirmationDialog = (newConfig: ConfirmationDialogConfig) => {
    context.setConfig(newConfig)
    openModal()
  }

  const hideConfirmationDialog = () => {
    closeModal()
    context.setConfig(null)
  }

  return {
    ...context,
    showConfirmationDialog,
    hideConfirmationDialog,
  }
}
