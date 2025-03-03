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

    // Use a timeout to ensure all content is rendered before scrolling
    // This helps when images are still loading
    setTimeout(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight, // Re-read scrollHeight in case it changed
        behavior: behavior,
      });
    }, 50);
  };

  // Create refs outside of useEffect
  const userScrollingImageRef = useRef(false);
  const userScrollingKeyboardRef = useRef(false);

  // Handle initial scroll behavior and add ref to onScrollToTopRef
  useEffect(() => {
    if (onScrollToTopRef) {
      onScrollToTopRef.current = detectScrollToTop;
    }

    if (scrollContainerRef.current) {
      // Only do initial scroll to bottom (don't scroll on dependency changes)
      if (isInitialScrollRef.current) {
        scrollToBottom(initialScrollBehavior);
        isInitialScrollRef.current = false;
      }

      // Add an event listener for image loading to handle layout shifts
      let scrollTimer = null;

      // Helper to track if user is actively scrolling
      const trackUserScrolling = () => {
        userScrollingImageRef.current = true;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          userScrollingImageRef.current = false;
        }, 200);
      };

      if (scrollContainerRef.current) {
        scrollContainerRef.current.addEventListener(
          "scroll",
          trackUserScrolling
        );
      }

      const handleImageLoad = () => {
        // Only auto-scroll if user is at bottom AND not actively scrolling
        if (isScrolledToBottom && !userScrollingImageRef.current) {
          setTimeout(() => scrollToBottom("auto"), 50);
        }
      };

      // Find all images in the container and add load event listeners
      const images = scrollContainerRef.current.querySelectorAll("img");
      images.forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", handleImageLoad);
        }
      });

      // Cleanup event listeners
      return () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.removeEventListener(
            "scroll",
            trackUserScrolling
          );

          const images = scrollContainerRef.current.querySelectorAll("img");
          images.forEach((img) => {
            img.removeEventListener("load", handleImageLoad);
          });
        }
        clearTimeout(scrollTimer);
      };
    }
  }, [
    detectScrollToTop,
    initialScrollBehavior,
    isScrolledToBottom,
    onScrollToTopRef,
  ]);

  // Add keyboard appearance detection for better button positioning
  useEffect(() => {
    const initialHeight = window.innerHeight;
    let isKeyboardVisible = false;
    let previousDiff = 0;
    const MIN_KEYBOARD_HEIGHT = 200; // Minimum height to consider as keyboard
    let scrollTimeout = null;

    // Helper to detect if user is actively scrolling
    const setScrolling = () => {
      userScrollingKeyboardRef.current = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        userScrollingKeyboardRef.current = false;
      }, 150); // Consider user done scrolling after 150ms of inactivity
    };

    // Add scroll listener to detect active scrolling
    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener("scroll", setScrolling);
    }

    const handleResize = () => {
      // Don't process resize events during active scrolling
      if (userScrollingKeyboardRef.current) return;

      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;

      // Only consider significant height changes (to avoid minor layout shifts)
      if (Math.abs(heightDiff - previousDiff) < 50) return;
      previousDiff = heightDiff;

      if (heightDiff > MIN_KEYBOARD_HEIGHT) {
        // Keyboard is likely visible
        if (!isKeyboardVisible) {
          isKeyboardVisible = true;

          // Adjust button position when keyboard appears
          const button = document.querySelector(".follow-button");
          if (button) {
            // Move the button up to be visible above the keyboard
            button.style.bottom = `${heightDiff + 20}px`;
            button.style.transition = "bottom 0.2s ease-out";
          }

          // ONLY scroll to bottom when keyboard first appears AND
          // user was already at the bottom
          if (isScrolledToBottom) {
            // Small delay to let layout adjust first
            setTimeout(() => scrollToBottom("auto"), 100);
          }
        }
      } else {
        // Keyboard is likely hidden
        if (isKeyboardVisible) {
          isKeyboardVisible = false;

          // Reset button position when keyboard disappears
          const button = document.querySelector(".follow-button");
          if (button) {
            // Let the CSS handle the positioning again
            button.style.bottom = "";
            button.style.transition = "bottom 0.3s ease-out";
          }
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener("scroll", setScrolling);
      }
      clearTimeout(scrollTimeout);
    };
  }, [isScrolledToBottom]);

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
      // Immediate scroll
      scrollToBottom(initialScrollBehavior);

      // Also scroll after a delay to account for images loading
      // This ensures we're at the bottom even if image loading changes content height
      setTimeout(() => {
        if (isScrolledToBottom) {
          scrollToBottom(initialScrollBehavior);
        }
      }, 300); // Longer delay to account for image loading
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
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling
            e.preventDefault(); // Prevent default action
            scrollToBottom();
          }}
          aria-label="Scroll to bottom"
          style={{
            visibility: "visible" /* Forces visibility for iOS */,
            display: "flex" /* Ensures flex display is applied */,
            pointerEvents: "auto" /* Ensures clickability on iOS */,
            boxShadow:
              "0 2px 10px rgba(0, 0, 0, 0.3)" /* Stronger shadow for visibility */,
            touchAction:
              "none" /* Prevent this element from handling touch events for scrolling */,
          }}
          onTouchStart={(e) => {
            // Only allow touch for the button click, not for scrolling
            e.stopPropagation();
          }}
        >
          <FaChevronDown size={18} />{" "}
          {/* Slightly larger icon for better visibility */}
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

  // Only make messages visible when loaded - with more stable timing
  useEffect(() => {
    // Track if the effect is still mounted
    let isMounted = true;

    if (!isLoading && messages.length > 0) {
      // In development mode, React can do double renders which can cause jank
      // Let's use RequestAnimationFrame to ensure we only update visibility during a proper frame
      requestAnimationFrame(() => {
        // Make sure component is still mounted before updating state
        if (!isMounted) return;

        // For iOS, add a slightly longer delay to ensure the DOM is stable
        if (isMobile && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
          // Delay rendering to avoid jitter, especially in dev mode
          setTimeout(() => {
            if (isMounted) {
              setMessagesVisible(true);
              initialRenderRef.current = false;
            }
          }, 200); // Increased delay for better stability on iOS
        } else {
          setMessagesVisible(true);
          initialRenderRef.current = false;
        }
      });
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [isLoading, messages, isMobile]);

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
          <div ref={bottomRef} className="bottom-spacer" />
        </CustomScrollToBottom>
      ) : (
        <div className="empty-chat-message">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
    </div>
  );
}
