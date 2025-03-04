import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import { createPortal } from "react-dom";
import { usePlatform } from "@/hooks/usePlatform";
import { usePromptStorage } from "@/hooks/usePromptStorage";
import "./ComposeModal.css";

// Define context types
interface ComposeContextType {
  message: string;
  setMessage: (message: string) => void;
  isComposeModalOpen: boolean;
  openComposeModal: () => void;
  closeComposeModal: () => void;
  handleSubmit: () => void;
  isWaitingForResponse: boolean;
  setIsWaitingForResponse: (isWaiting: boolean) => void;
  registerSubmitCallback: (callback: () => void) => void;
}

// Create compose context
const ComposeContext = createContext<ComposeContextType | null>(null);

// Provider component
interface ComposeProviderProps {
  children: React.ReactNode;
}

export const ComposeProvider: React.FC<ComposeProviderProps> = ({
  children,
}) => {
  const { promptData, savePrompt, clearPrompt } = usePromptStorage();
  const [message, setMessage] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // Load saved prompt from storage when component mounts
  useEffect(() => {
    if (promptData && promptData.prompt) {
      setMessage(promptData.prompt);
    }
  }, [promptData]);

  // Callback function to be overridden by SendMessage component
  const submitCallbackRef = useRef<(() => void) | null>(null);

  const registerSubmitCallback = (callback: () => void) => {
    submitCallbackRef.current = callback;
  };

  const handleSubmit = () => {
    if (submitCallbackRef.current) {
      submitCallbackRef.current();
      clearPrompt();
      closeComposeModal();
    }
  };

  // Update message and save to storage
  const handleSetMessage = (newMessage: string) => {
    setMessage(newMessage);
    savePrompt(newMessage);
  };

  const openComposeModal = () => setIsComposeModalOpen(true);
  const closeComposeModal = () => setIsComposeModalOpen(false);

  const value = {
    message,
    setMessage: handleSetMessage,
    isComposeModalOpen,
    openComposeModal,
    closeComposeModal,
    handleSubmit,
    isWaitingForResponse,
    registerSubmitCallback,
    setIsWaitingForResponse,
  };

  return (
    <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>
  );
};

// Custom hook to use the compose context
export const useCompose = () => {
  const context = useContext(ComposeContext);
  if (!context) {
    throw new Error("useCompose must be used within a ComposeProvider");
  }
  return context;
};

// Modal component for fullscreen compose
export const FullscreenComposeModal: React.FC = () => {
  const {
    message,
    setMessage,
    isComposeModalOpen,
    closeComposeModal,
    handleSubmit,
    isWaitingForResponse,
  } = useCompose();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile } = usePlatform();

  useEffect(() => {
    // Focus textarea when modal opens and position cursor at the end of the text
    if (isComposeModalOpen && textAreaRef.current) {
      setTimeout(() => {
        const textarea = textAreaRef.current;
        if (!textarea) return;
        textarea.focus();
        // Place cursor at the end of the text
        const textLength = textarea.value.length;
        textarea.setSelectionRange(textLength, textLength);
      }, 100);
    }

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modal
      if (e.key === "Escape" && isComposeModalOpen) {
        closeComposeModal();
      }

      // Cmd/Ctrl+Enter to submit
      if (
        !isMobile &&
        isComposeModalOpen &&
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter"
      ) {
        e.preventDefault();
        if (message.trim()) {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isComposeModalOpen, closeComposeModal, message, handleSubmit, isMobile]);

  if (!isComposeModalOpen) return null;

  return createPortal(
    <div className="fullscreen-compose-overlay">
      <div className="fullscreen-compose-container">
        <div className="header modal fullscreen-compose-header">
          <h3>Compose Message</h3>
          <div className="modal-controls">
            <div className="modal-control close" onClick={closeComposeModal}>
              <FaTimes size={20} />
            </div>
          </div>
        </div>
        <textarea
          ref={textAreaRef}
          className="fullscreen-compose-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
        />
        <div className="fullscreen-compose-footer">
          <button
            className={`ditto-button primary fullscreen-compose-send-button ${isWaitingForResponse ? "disabled" : ""}`}
            onClick={() => {
              // Execute the submit handler
              if (message.trim()) {
                handleSubmit();
              }
            }}
            disabled={isWaitingForResponse}
          >
            <span className="button-icon">
              <FaPaperPlane />
            </span>{" "}
            Send {!isMobile && <span className="shortcut-hint">⌘↵</span>}
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body,
  );
};
