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
  setMessage: React.Dispatch<React.SetStateAction<string>>;
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
  const { promptData, savePrompt } = usePromptStorage();
  const [message, setMessage] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // Load saved prompt from storage when component mounts
  useEffect(() => {
    if (promptData && promptData.prompt) {
      setMessage(promptData.prompt);
    }
  }, [promptData]);

  const submitCallback = useRef<() => void | null>(null);

  const registerSubmitCallback = (callback: () => void) => {
    submitCallback.current = callback;
  };

  const handleSubmit = () => {
    if (submitCallback.current) {
      submitCallback.current();
    }
    closeComposeModal();
  };

  // Save message to local storage when it changes
  useEffect(() => {
    if (message.trim()) {
      savePrompt(message);
    }
  }, [message, savePrompt]);

  const openComposeModal = () => setIsComposeModalOpen(true);
  const closeComposeModal = () => setIsComposeModalOpen(false);

  return (
    <ComposeContext.Provider
      value={{
        message,
        setMessage,
        isComposeModalOpen,
        openComposeModal,
        closeComposeModal,
        handleSubmit,
        isWaitingForResponse,
        setIsWaitingForResponse,
        registerSubmitCallback,
      }}
    >
      {children}
    </ComposeContext.Provider>
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
    <div className="modal container fullscreen compose-modal">
      <div className="modal content">
        <div className="header modal fullscreen">
          <h3>Compose Message</h3>
          <div className="modal-controls">
            <div className="modal-control close" onClick={closeComposeModal}>
              <FaTimes size={20} />
            </div>
          </div>
        </div>
        <form
          className="modal wrapper"
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) {
              handleSubmit();
            }
          }}
        >
          <div className="modal body">
            <textarea
              ref={textAreaRef}
              className="compose-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              spellCheck="true"
              autoFocus
            />
          </div>
          <div className="modal footer">
            <button
              type="submit"
              className={`ditto-button primary ${isWaitingForResponse ? "disabled" : ""}`}
              disabled={isWaitingForResponse || !message.trim()}
            >
              <span className="button-icon">
                <FaPaperPlane />
              </span>{" "}
              Send {!isMobile && <span className="shortcut-hint">⌘↵</span>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body,
  );
};
