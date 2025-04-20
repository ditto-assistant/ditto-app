import React, { useRef, useEffect } from "react"
import { PlaneTakeoff, X } from "lucide-react"
import { usePlatform } from "@/hooks/usePlatform"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useComposeContext } from "@/contexts/ComposeContext"
import { Textarea } from "./ui/textarea"

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

  useEffect(() => {
    // Handle keyboard shortcuts (Cmd/Ctrl+Enter)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobile && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (message.trim()) {
          handleSubmit()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [message, handleSubmit, isMobile])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (message.trim()) {
      handleSubmit()
    }
    closeComposeModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={cn(
          "bg-background flex flex-col overflow-hidden",
          "fixed inset-0 h-screen w-screen max-w-none rounded-none border-none p-0",
          "translate-x-0 translate-y-0"
        )}
      >
        {/* Accessibility additions */}
        <DialogHeader className="border-b flex items-center justify-between p-3 select-none">
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
        <div className="flex flex-col flex-1 h-full w-full">
          <form
            id="compose-form"
            className="flex flex-col h-full w-full"
            onSubmit={handleFormSubmit}
          >
            <Textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              spellCheck="true"
              className="text-foreground placeholder:text-muted-foreground/70"
            />
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ComposeModal
