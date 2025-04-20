import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react"
import { PlaneTakeoff, X } from "lucide-react"
import { usePlatform } from "@/hooks/usePlatform"
import { usePromptStorage } from "@/hooks/usePromptStorage"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useModal } from "@/hooks/useModal"

// Define context types
interface ComposeContextType {
  message: string
  setMessage: React.Dispatch<React.SetStateAction<string>>
  openComposeModal: () => void
  closeComposeModal: () => void
  handleSubmit: () => void
  isWaitingForResponse: boolean
  setIsWaitingForResponse: (isWaiting: boolean) => void
  registerSubmitCallback: (callback: () => void) => void
}

// Custom hook to use the compose context
export const useCompose = () => {
  const { promptData, savePrompt } = usePromptStorage()
  const [message, setMessage] = useState("")
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const { createOpenHandler, createCloseHandler } = useModal()
  const openComposeModal = createOpenHandler("composeModal")
  const closeComposeModal = createCloseHandler("composeModal")

  // Load saved prompt from storage when component mounts
  useEffect(() => {
    if (promptData && promptData.prompt) {
      setMessage(promptData.prompt)
    }
  }, [promptData])

  const submitCallback = useRef<(() => void) | null>(null)

  const registerSubmitCallback = (callback: () => void) => {
    submitCallback.current = callback
  }

  const handleSubmit = () => {
    if (submitCallback.current) {
      submitCallback.current()
    }
    closeComposeModal()
  }

  useEffect(() => {
    savePrompt(message)
  }, [message, savePrompt])

  return {
    message,
    setMessage,
    openComposeModal,
    closeComposeModal,
    handleSubmit,
    isWaitingForResponse,
    setIsWaitingForResponse,
    registerSubmitCallback,
  }
}
// Modal component for fullscreen compose
const ComposeModal: React.FC = () => {
  const {
    message,
    setMessage,
    closeComposeModal,
    handleSubmit,
    isWaitingForResponse,
  } = useCompose()

  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const { isMobile } = usePlatform()
  useEffect(() => {
    // Focus textarea when modal opens and position cursor at the end of the text
    if (textAreaRef.current) {
      const textarea = textAreaRef.current
      if (!textarea) return
      textarea.focus()
      const textLength = textarea.value.length
      textarea.setSelectionRange(textLength, textLength)
    }
  }, [])

  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Enter to submit
      if (!isMobile && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (message.trim()) {
          handleSubmit()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeComposeModal, message, handleSubmit, isMobile])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (message.trim()) {
      handleSubmit()
    }
  }

  return (
    <Modal
      id="composeModal"
      title="Compose Message"
      fullScreen={true}
      notResizable={true}
      headerLeftContent={
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
      }
    >
      <div className="flex flex-col h-full w-full">
        <form
          id="compose-form"
          className="flex flex-col h-full w-full"
          onSubmit={handleFormSubmit}
        >
          <textarea
            ref={textAreaRef}
            className="flex-1 w-full outline-none resize-none bg-background p-4 text-foreground text-base leading-relaxed min-h-[200px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            spellCheck="true"
            autoFocus
          />
        </form>
      </div>
    </Modal>
  )
}

export default ComposeModal
