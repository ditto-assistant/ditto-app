import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useState,
  useEffect,
} from "react"
import { usePromptStorage } from "@/hooks/usePromptStorage"
import { debounce } from "@/utils/debounce"

interface ComposeContextType {
  message: string
  setMessage: (message: string) => void
  handleSubmit: () => void
  isWaitingForResponse: boolean
  setIsWaitingForResponse: (isWaiting: boolean) => void
  registerSubmitCallback: (callback: () => void) => void
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  openComposeModal: () => void
  closeComposeModal: () => void
}

const ComposeContext = createContext<ComposeContextType | undefined>(undefined)

export const ComposeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { promptData, savePrompt } = usePromptStorage()
  const [isOpen, setIsOpen] = useState(false)

  // Use local state for better typing performance
  const [localMessage, setLocalMessage] = useState("")

  // Initialize with saved prompt data when available
  useEffect(() => {
    if (promptData?.prompt) {
      setLocalMessage(promptData.prompt)
    }
  }, [promptData?.prompt])

  // Debounced function to save to storage
  const debouncedSave = useRef(
    debounce((text: string) => {
      savePrompt(text)
    }, 500)
  ).current

  // Custom setter that updates local state immediately and debounces storage
  const setMessage = (msg: string) => {
    setLocalMessage(msg)
    debouncedSave(msg)
  }

  const submitCallback = useRef<(() => void) | null>(null)
  const registerSubmitCallback = (callback: () => void) => {
    submitCallback.current = callback
  }

  const handleSubmit = () => {
    if (submitCallback.current) {
      submitCallback.current()
    }
  }

  const openComposeModal = () => setIsOpen(true)
  const closeComposeModal = () => setIsOpen(false)

  const [isWaitingForResponse, setIsWaitingForResponse] = React.useState(false)

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  return (
    <ComposeContext.Provider
      value={{
        message: localMessage,
        setMessage,
        handleSubmit,
        isWaitingForResponse,
        setIsWaitingForResponse,
        registerSubmitCallback,
        isOpen,
        setIsOpen,
        openComposeModal,
        closeComposeModal,
      }}
    >
      {children}
    </ComposeContext.Provider>
  )
}

export const useComposeContext = (): ComposeContextType => {
  const context = useContext(ComposeContext)
  if (!context) {
    throw new Error("useComposeContext must be used within a ComposeProvider")
  }
  return context
}
