import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react"
import { usePromptStorage } from "@/hooks/usePromptStorage"
import { debounce } from "perfect-debounce"

interface ComposeContextType {
  message: string
  setMessage: (message: string) => void
  appendToMessage: (textToAppend: string) => void
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

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce((text: string) => savePrompt(text), 500),
    [savePrompt]
  )

  // Custom setter that updates local state immediately and debounces storage
  const setMessage = useCallback(
    (msg: string) => {
      setLocalMessage(msg)
      debouncedSave(msg)
    },
    [debouncedSave]
  )

  // Function to append text to existing message
  const appendToMessage = useCallback(
    (textToAppend: string) => {
      const newMessage = localMessage + textToAppend
      setLocalMessage(newMessage)
      debouncedSave(newMessage)
    },
    [localMessage, debouncedSave]
  )

  const submitCallback = useRef<(() => void) | null>(null)
  const registerSubmitCallback = (callback: () => void) => {
    submitCallback.current = callback
  }

  const handleSubmit = useCallback(() => {
    if (submitCallback.current) {
      submitCallback.current()
    }
  }, [])

  const openComposeModal = useCallback(() => setIsOpen(true), [])
  const closeComposeModal = useCallback(() => setIsOpen(false), [])

  const [isWaitingForResponse, setIsWaitingForResponse] = React.useState(false)

  // perfect-debounce handles cleanup internally

  return (
    <ComposeContext.Provider
      value={{
        message: localMessage,
        setMessage,
        appendToMessage,
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
