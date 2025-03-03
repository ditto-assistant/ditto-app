import { useEffect, useRef, useState } from "react";
import "./ChatFeed.css";
import { motion, AnimatePresence } from "framer-motion";
import { FiCopy } from "react-icons/fi";
import { FaBrain, FaTrash, FaChevronDown } from "react-icons/fa";
import { useMemoryDeletion } from "../hooks/useMemoryDeletion";
import { toast } from "react-hot-toast";
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork";
import { useConversationHistory } from "@/hooks/useConversationHistory";
import { usePlatform } from "@/hooks/usePlatform";
import ChatMessage from "./ChatMessage";

// Add this helper function at the top level
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};

// Debug helper for development only
const ScrollDebugger = ({ show, scrollInfo }) => {
  if (!show) return null;

  return (
    <div className="scroll-debugger">
      <div>scrollTop: {scrollInfo.scrollTop}</div>
      <div>hasNextPage: {scrollInfo.hasNextPage ? "true" : "false"}</div>
      <div>isLoading: {scrollInfo.isLoading ? "true" : "false"}</div>
      <div>isFetching: {scrollInfo.isFetchingNextPage ? "true" : "false"}</div>
      <div>isNearTop: {scrollInfo.isNearTop ? "true" : "false"}</div>
    </div>
  );
};

// Custom ScrollToBottom component
const CustomScrollToBottom = ({
  children,
  className,
  onScroll,
  onScrollComplete,
  className: containerClassName,
  style: containerStyle,
  scrollViewClassName,
  initialScrollBehavior = "auto",
  detectScrollToTop = () => {},
  onScrollToTopRef,
}) => {
  const scrollContainerRef = useRef(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const isInitialScrollRef = useRef(true);
  const prevScrollTopRef = useRef(0);
  const scrollHeightRef = useRef(0);

  // Scroll to bottom programmatically
  const scrollToBottom = (behavior = "smooth") => {
    if (!scrollContainerRef.current) return;

    const scrollContainer = scrollContainerRef.current;
    const scrollHeight = scrollContainer.scrollHeight;

    scrollContainer.scrollTo({
      top: scrollHeight,
      behavior: behavior,
    });
  };

  // Handle initial scroll behavior and add ref to onScrollToTopRef
  useEffect(() => {
    if (onScrollToTopRef) {
      onScrollToTopRef.current = detectScrollToTop;
    }

    if (scrollContainerRef.current) {
      // Initial scroll to bottom without animation
      scrollToBottom(initialScrollBehavior);
      isInitialScrollRef.current = false;
    }
  }, [initialScrollBehavior, onScrollToTopRef]);

  // Listen for scroll events
  const handleScroll = (e) => {
    if (!scrollContainerRef.current) return;

    const scrollContainer = scrollContainerRef.current;
    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;

    // Check if scrolled to bottom (with a small buffer)
    const isBottom = scrollHeight - scrollTop - clientHeight < 30;
    setIsScrolledToBottom(isBottom);
    setShowScrollToBottom(!isBottom);

    // Detect scroll to top for pagination
    const isNearTop = scrollTop < 50;

    if (
      isNearTop &&
      scrollTop < prevScrollTopRef.current &&
      scrollHeightRef.current === scrollHeight
    ) {
      detectScrollToTop();
    }

    // Track direction and scroll height for next check
    prevScrollTopRef.current = scrollTop;
    scrollHeightRef.current = scrollHeight;

    // Call callback if provided
    if (onScroll) {
      onScroll(e);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current && isScrolledToBottom) {
      scrollToBottom(initialScrollBehavior);
    }

    if (onScrollComplete) {
      onScrollComplete();
    }
  }, [children, isScrolledToBottom, initialScrollBehavior, onScrollComplete]);

  return (
    <div className={containerClassName} style={containerStyle}>
      <div
        ref={scrollContainerRef}
        className={scrollViewClassName || "custom-scroll-view"}
        onScroll={handleScroll}
        style={{
          overflowY: "auto",
          height: "100%",
          position: "relative",
        }}
      >
        {children}
      </div>

      {showScrollToBottom && (
        <button
          className="follow-button"
          onClick={() => scrollToBottom()}
          aria-label="Scroll to bottom"
        >
          <FaChevronDown />
        </button>
      )}
    </div>
  );
};

// Avatar action menu component
const AvatarActionMenu = ({
  isVisible,
  isUser,
  onCopy,
  onDelete,
  onShowMemories,
}) => {
  if (!isVisible) return null;

  const direction = isUser ? "left" : "right";

  return (
    <motion.div
      className={`avatar-action-menu ${direction}`}
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isUser ? 20 : -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <button
        className="action-icon-button"
        onClick={onCopy}
        aria-label="Copy message"
      >
        <FiCopy />
      </button>
      <button
        className="action-icon-button"
        onClick={onShowMemories}
        aria-label="Show memories"
      >
        <FaBrain />
      </button>
      <button
        className="action-icon-button delete"
        onClick={onDelete}
        aria-label="Delete message"
      >
        <FaTrash />
      </button>
    </motion.div>
  );
};

export default function ChatFeed({
  scrollToBottom = true,
  startAtBottom = true,
  bubbleStyles = {
    text: {
      fontSize: 14,
    },
    chatbubble: {
      borderRadius: 20,
      padding: 10,
    },
  },
}) {
  const {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useConversationHistory();
  const { showMemoryNetwork } = useMemoryNetwork();
  const { confirmMemoryDeletion } = useMemoryDeletion();
  const bottomRef = useRef(null);
  const { isMobile } = usePlatform();

  // State for UI interactions
  const [activeAvatarIndex, setActiveAvatarIndex] = useState(null);

  // State for scroll and content management
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [isNearTop, setIsNearTop] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [shouldFetchNext, setShouldFetchNext] = useState(false);

  // Refs for tracking scroll state
  const initialRenderRef = useRef(true);
  const prevHeightRef = useRef(0);
  const fetchingRef = useRef(false);
  const detectScrollToTopRef = useRef(null);

  // Handle avatar click to show menu
  const handleAvatarClick = (e, index) => {
    e.stopPropagation(); // Prevent bubbling to document click handler

    if (activeAvatarIndex === index) {
      // If clicking the same avatar, hide the menu
      setActiveAvatarIndex(null);
    } else {
      // Show menu for this avatar
      setActiveAvatarIndex(index);
      triggerHapticFeedback();
    }
  };

  // Only make messages visible when loaded
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setMessagesVisible(true);
      initialRenderRef.current = false;
    }
  }, [isLoading, messages]);

  // Function to handle scroll to top detection
  const handleScrollToTop = () => {
    if (
      hasNextPage &&
      !isLoading &&
      !isFetchingNextPage &&
      !fetchingRef.current
    ) {
      console.log("AT TOP DETECTED: Triggering fetch");
      fetchingRef.current = true;
      setShouldFetchNext(true);
    }
  };

  // Handle pagination data loading
  useEffect(() => {
    const fetchOlderMessages = async () => {
      if (!shouldFetchNext) return;

      try {
        console.log("Fetching older messages...");
        // Execute the fetch
        await fetchNextPage();

        console.log("Fetch complete");

        // Reset state with a small delay to prevent immediate re-trigger
        setTimeout(() => {
          fetchingRef.current = false;
          setShouldFetchNext(false);
          console.log("Fetch state reset");
        }, 500);
      } catch (error) {
        console.error("Error loading more messages:", error);
        fetchingRef.current = false;
        setShouldFetchNext(false);
      }
    };

    if (shouldFetchNext) {
      fetchOlderMessages();
    }
  }, [shouldFetchNext, fetchNextPage]);

  // Handle clicking outside to close action menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeAvatarIndex !== null) {
        // Check if the click is outside the action menu and avatar
        let targetElement = e.target;
        let isClickOnMenu = false;

        while (targetElement && !isClickOnMenu) {
          if (
            targetElement.classList &&
            (targetElement.classList.contains("avatar-action-menu") ||
              targetElement.classList.contains("message-avatar") ||
              targetElement.classList.contains("action-icon-button"))
          ) {
            isClickOnMenu = true;
          }
          targetElement = targetElement.parentElement;
        }

        if (!isClickOnMenu) {
          setActiveAvatarIndex(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [activeAvatarIndex]);

  // Message action handlers
  const handleCopy = (message, type = "prompt") => {
    const textToCopy = type === "prompt" ? message.prompt : message.response;
    if (!textToCopy) {
      toast.error("No content to copy");
      return;
    }

    navigator.clipboard.writeText(textToCopy).then(
      () => {
        toast.success("Copied to clipboard");
        setActiveAvatarIndex(null);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy text");
      }
    );
  };

  // Handle memory deletion
  const handleMessageDelete = async (message) => {
    setActiveAvatarIndex(null);
    if (!message.id) {
      console.error("Cannot delete message: missing ID");
      return;
    }
    try {
      await confirmMemoryDeletion(message.id, {
        onSuccess: () => {
          refetch(); // Refresh the conversation after deletion
        },
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  // Handle showing memory network
  const handleShowMemories = async (message) => {
    setActiveAvatarIndex(null);
    try {
      await showMemoryNetwork(message);
    } catch (error) {
      console.error("Error showing memory network:", error);
      toast.error("Failed to show memory network");
    }
  };

  return (
    <div className="chat-feed-container">
      {/* Debug component - only in development */}
      {process.env.NODE_ENV === "development" && (
        <ScrollDebugger
          show={process.env.NODE_ENV === "development"}
          scrollInfo={{
            scrollTop,
            hasNextPage,
            isLoading,
            isFetchingNextPage,
            isNearTop,
          }}
        />
      )}

      {/* Loading indicator for pagination */}
      {isFetchingNextPage && (
        <div
          className="loading-indicator"
          style={{ position: "sticky", top: 0, zIndex: 10 }}
        >
          <div className="loading-spinner"></div>
          <div>Loading more messages...</div>
        </div>
      )}

      {/* Main content area */}
      {isLoading ? (
        <div className="empty-chat-message">
          <div className="loading-spinner"></div>
          <p>Loading conversation...</p>
        </div>
      ) : messages && messages.length > 0 ? (
        <CustomScrollToBottom
          className="messages-container"
          scrollViewClassName="messages-scroll-view"
          initialScrollBehavior="auto"
          detectScrollToTop={handleScrollToTop}
          onScrollToTopRef={detectScrollToTopRef}
          style={{
            opacity: messagesVisible ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          {messages
            .map((message, index) => {
              const isUser =
                message.prompt && !message.prompt.includes("SYSTEM:");
              const isLast = index === messages.length - 1;

              // Create separate IDs for prompt and response
              const promptId = `prompt-${message.id || index}`;
              const responseId = `response-${message.id || index}`;

              // Check if this specific message is active
              const isPromptActive = activeAvatarIndex === promptId;
              const isResponseActive = activeAvatarIndex === responseId;

              return (
                <div key={message.id || index} className="message-pair">
                  {/* Render user message (prompt) */}
                  {message.prompt && isUser && (
                    <ChatMessage
                      pairID={message.id}
                      content={message.prompt}
                      timestamp={
                        message.timestamp
                          ? new Date(message.timestamp).getTime()
                          : Date.now()
                      }
                      isUser={true}
                      isLast={isLast}
                      bubbleStyles={bubbleStyles}
                      onAvatarClick={(e) => handleAvatarClick(e, promptId)}
                      showMenu={isPromptActive}
                      menuProps={{
                        onCopy: () => handleCopy(message, "prompt"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
                    />
                  )}

                  {/* Render Ditto's response */}
                  {message.response && (
                    <ChatMessage
                      content={message.response}
                      timestamp={
                        message.timestamp
                          ? new Date(message.timestamp).getTime()
                          : Date.now()
                      }
                      isUser={false}
                      isLast={isLast}
                      bubbleStyles={bubbleStyles}
                      onAvatarClick={(e) => handleAvatarClick(e, responseId)}
                      showMenu={isResponseActive}
                      menuProps={{
                        onCopy: () => handleCopy(message, "response"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
                    />
                  )}
                </div>
              );
            })
            .reverse()}
          <div ref={bottomRef} style={{ height: "20px" }} />
        </CustomScrollToBottom>
      ) : (
        <div className="empty-chat-message">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
    </div>
  );
}
