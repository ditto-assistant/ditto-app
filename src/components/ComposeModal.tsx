import React, { useRef, useEffect, useCallback } from "react"
import { PlaneTakeoff } from "lucide-react"
import { usePlatform } from "@/hooks/usePlatform"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useComposeContext } from "@/contexts/ComposeContext"

// Modal component for fullscreen compose using ShadCN Dialog
const ComposeModal: React.FC = () => {
  const {
    message,
    setMessage,
    handleSubmit,
    isWaitingForResponse,
    isOpen,
    setIsOpen,
    closeComposeModal,
  } = useComposeContext()
  const { isMobile } = usePlatform()
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
    },
    [setMessage]
  )

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (message.trim()) {
        handleSubmit()
      }
      closeComposeModal()
    },
    [message, handleSubmit, closeComposeModal]
  )

  useEffect(() => {
    // Handle keyboard shortcuts (Cmd/Ctrl+Enter)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobile && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (message.trim()) {
          handleSubmit()
          closeComposeModal()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [message, handleSubmit, isMobile, closeComposeModal])

  // Focus the textarea when the modal opens
  useEffect(() => {
    if (isOpen && textAreaRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        textAreaRef.current?.focus()
        // Place cursor at the end of the text
        if (textAreaRef.current) {
          const textLength = textAreaRef.current.value.length
          textAreaRef.current.setSelectionRange(textLength, textLength)
        }
      }, 50)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={cn(
          "bg-background flex flex-col overflow-hidden gap-0",
          isMobile
            ? "fixed inset-0 h-[100dvh] w-screen max-w-none rounded-none border-none p-0 translate-x-0 translate-y-0"
            : "h-[80vh] max-h-[80vh] w-[90vw] max-w-4xl border rounded-lg shadow-lg mx-auto"
        )}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Accessibility additions */}
        <DialogHeader
          className="border-b flex items-center justify-between p-3 select-none sticky top-0 z-10 bg-background"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div>
            <Button
              type="submit"
              form="compose-form"
              variant="default"
              size="sm"
              className={cn(
                "bg-gradient-to-r from-primary to-blue-400",
                "flex items-center gap-2",
                "mr-2 h-8"
              )}
              disabled={isWaitingForResponse || !message.trim()}
            >
              <PlaneTakeoff className="h-4 w-4" />
              <span>Send</span>
              {!isMobile && <span className="text-xs opacity-75">⌘↵</span>}
            </Button>
          </div>
          <DialogTitle className="sr-only">Compose Message</DialogTitle>
          <DialogDescription className="sr-only">
            Type your message in the text area below and press Send.
          </DialogDescription>
        </DialogHeader>

        {/* Body with form */}
        <div className="flex flex-col flex-1 min-h-0 h-full w-full">
          <form
            id="compose-form"
            className="flex flex-col flex-1 min-h-0 h-full w-full"
            onSubmit={handleFormSubmit}
          >
            <Textarea
              ref={textAreaRef}
              autoFocus
              value={message}
              onChange={handleChange}
              placeholder="Message Ditto"
              spellCheck="true"
              className="text-foreground placeholder:text-muted-foreground/70 resize-none border-none focus-visible:ring-0 p-4 overflow-y-auto overscroll-contain flex-1 min-h-0 w-full"
            />
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ComposeModal
