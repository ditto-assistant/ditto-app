import { ReactNode, createContext, useContext, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmationDialogConfig {
  title: string
  content: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
  variant?: "default" | "destructive"
}

interface ConfirmationDialogContextType {
  config: ConfirmationDialogConfig | null
  showConfirmationDialog: (config: ConfirmationDialogConfig) => void
  hideConfirmationDialog: () => void
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
  const [open, setOpen] = useState(false)

  const showConfirmationDialog = (newConfig: ConfirmationDialogConfig) => {
    setConfig(newConfig)
    setOpen(true)
  }

  const hideConfirmationDialog = () => {
    setOpen(false)
    // Clear config after dialog animation finishes
    setTimeout(() => setConfig(null), 300)
  }

  const handleCancel = () => {
    if (config?.onCancel) {
      config.onCancel()
    }
    hideConfirmationDialog()
  }

  const handleConfirm = () => {
    if (config?.onConfirm) {
      config.onConfirm()
    }
    hideConfirmationDialog()
  }

  return (
    <ConfirmationDialogContext.Provider
      value={{
        config,
        showConfirmationDialog,
        hideConfirmationDialog,
      }}
    >
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {config && (
            <>
              <DialogHeader>
                <DialogTitle>{config.title}</DialogTitle>
                {typeof config.content === "string" ? (
                  <DialogDescription>{config.content}</DialogDescription>
                ) : (
                  <div className="mt-2">{config.content}</div>
                )}
              </DialogHeader>
              <DialogFooter className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={handleCancel}>
                  {config.cancelLabel || "Cancel"}
                </Button>
                <Button
                  variant={
                    config.variant === "destructive" ? "destructive" : "default"
                  }
                  onClick={handleConfirm}
                >
                  {config.confirmLabel || "Confirm"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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

  return context
}
