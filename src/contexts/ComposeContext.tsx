import React, {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useState,
} from "react"
import { usePromptStorage } from "@/hooks/usePromptStorage"

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

  const message = promptData?.prompt || ""
  const setMessage = (msg: string) => savePrompt(msg)

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

  return (
    <ComposeContext.Provider
      value={{
        message,
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
