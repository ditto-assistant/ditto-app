import { useEffect, useRef, useState, forwardRef } from "react"
import "./ChatFeed.css"
import { ChevronDown } from "lucide-react"
import { useMemoryDeletion } from "../hooks/useMemoryDeletion"
import { toast } from "sonner"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { usePlatform } from "@/hooks/usePlatform"
import { useMemorySyncContext } from "@/contexts/MemorySyncContext"
import ChatMessage from "./ChatMessage"

const CustomScrollToBottom = ({
  children,
  onScroll,
  onScrollComplete,
  className: containerClassName,
  style: containerStyle,
  scrollViewClassName,
  initialScrollBehavior = "auto",
  detectScrollToTop = () => {},
  onScrollToTopRef,
  forceScrollToBottomRef,
}) => {
  const scrollContainerRef = useRef(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const isInitialScrollRef = useRef(true)
  const prevScrollTopRef = useRef(0)
  const scrollHeightRef = useRef(0)

  const scrollToBottom = (behavior = "smooth") => {
    if (!scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current

    // For immediate scrolling during streaming, reduce timeout
    const delay = behavior === "auto" ? 10 : 50

    setTimeout(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: behavior,
      })
    }, delay)
  }

  const userScrollingImageRef = useRef(false)
  const userScrollingKeyboardRef = useRef(false)
  const userScrollingManualRef = useRef(false) // Track manual scrolling during streaming
  const streamingTimeoutRef = useRef(null) // Track if we're in active streaming mode

  // Expose force scroll function to parent
  const forceScrollToBottom = () => {
    // Clear all manual scrolling flags and force scroll to bottom for new messages
    userScrollingManualRef.current = false
    userScrollingImageRef.current = false
    userScrollingKeyboardRef.current = false

    // Force scroll to bottom immediately
    if (scrollContainerRef.current) {
      setTimeout(() => scrollToBottom("auto"), 50)
      // Additional checks
      setTimeout(() => scrollToBottom("auto"), 150)
      setTimeout(() => scrollToBottom("auto"), 300)
    }
  }

  useEffect(() => {
    if (onScrollToTopRef) {
      onScrollToTopRef.current = detectScrollToTop
    }

    if (forceScrollToBottomRef) {
      forceScrollToBottomRef.current = forceScrollToBottom
    }

    if (scrollContainerRef.current) {
      if (isInitialScrollRef.current) {
        // Force immediate scroll to bottom on initial load
        scrollToBottom("auto")
        // Double-check to ensure we're fully at bottom
        setTimeout(() => scrollToBottom("auto"), 100)
        isInitialScrollRef.current = false
      }

      let scrollTimer = null

      const trackUserScrolling = () => {
        userScrollingImageRef.current = true
        userScrollingManualRef.current = true
        clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
          userScrollingImageRef.current = false
          userScrollingManualRef.current = false
        }, 500) // Increased timeout for better streaming detection
      }

      // Store the ref value in a variable to avoid issues in cleanup function
      const currentScrollContainer = scrollContainerRef.current

      if (currentScrollContainer) {
        currentScrollContainer.addEventListener("scroll", trackUserScrolling)
      }

      const handleImageLoad = () => {
        if (isScrolledToBottom && !userScrollingImageRef.current) {
          setTimeout(() => scrollToBottom("auto"), 50)
        }
      }

      const images = currentScrollContainer.querySelectorAll("img")
      images.forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", handleImageLoad)
        }
      })

      return () => {
        if (currentScrollContainer) {
          currentScrollContainer.removeEventListener(
            "scroll",
            trackUserScrolling
          )

          const images = currentScrollContainer.querySelectorAll("img")
          images.forEach((img) => {
            img.removeEventListener("load", handleImageLoad)
          })
        }
        clearTimeout(scrollTimer)
      }
    }

    // Cleanup streaming timeout on unmount
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current)
      }
    }
  }, [
    detectScrollToTop,
    initialScrollBehavior,
    isScrolledToBottom,
    onScrollToTopRef,
  ])

  useEffect(() => {
    const initialHeight = window.innerHeight
    let isKeyboardVisible = false
    let previousDiff = 0
    const MIN_KEYBOARD_HEIGHT = 200
    let scrollTimeout = null

    const setScrolling = () => {
      userScrollingKeyboardRef.current = true
      userScrollingManualRef.current = true
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        userScrollingKeyboardRef.current = false
        userScrollingManualRef.current = false
      }, 500) // Increased timeout to match other scroll detection
    }

    // Store the ref value in a variable to avoid issues in cleanup function
    const currentScrollContainer = scrollContainerRef.current

    if (currentScrollContainer) {
      currentScrollContainer.addEventListener("scroll", setScrolling)
    }

    const handleResize = () => {
      if (userScrollingKeyboardRef.current) return

      const currentHeight = window.innerHeight
      const heightDiff = initialHeight - currentHeight

      if (Math.abs(heightDiff - previousDiff) < 50) return
      previousDiff = heightDiff

      if (heightDiff > MIN_KEYBOARD_HEIGHT) {
        if (!isKeyboardVisible) {
          isKeyboardVisible = true

          const button = document.querySelector(".follow-button")
          if (button) {
            button.style.bottom = `${heightDiff + 20}px`
            button.style.transition = "bottom 0.2s ease-out"
          }

          if (isScrolledToBottom) {
            setTimeout(() => scrollToBottom("auto"), 100)
          }
        }
      } else {
        if (isKeyboardVisible) {
          isKeyboardVisible = false

          const button = document.querySelector(".follow-button")
          if (button) {
            button.style.bottom = ""
            button.style.transition = "bottom 0.3s ease-out"
          }
        }
      }
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (currentScrollContainer) {
        currentScrollContainer.removeEventListener("scroll", setScrolling)
      }
      clearTimeout(scrollTimeout)
    }
  }, [isScrolledToBottom])

  const handleScroll = (e) => {
    if (!scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    const scrollTop = scrollContainer.scrollTop
    const scrollHeight = scrollContainer.scrollHeight
    const clientHeight = scrollContainer.clientHeight

    const isBottom = scrollHeight - scrollTop - clientHeight < 100 // Increased from 50 to 100 for better tolerance

    // Minimal logging for debugging
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Only mark as manual scrolling if:
    // 1. User scrolled away from bottom AND
    // 2. The scroll position actually decreased significantly (user scrolled up) AND
    // 3. Content hasn't changed AND we're not in streaming mode
    if (!isBottom && isScrolledToBottom) {
      const contentUnchanged = scrollHeight === scrollHeightRef.current
      const isStreamingMode = streamingTimeoutRef.current !== null

      // During streaming mode, be EXTREMELY restrictive about manual scroll detection
      if (isStreamingMode) {
        // During streaming, only consider it manual if:
        // 1. User scrolled up by more than 100px
        // 2. AND content didn't change at all
        // 3. AND they're currently far from bottom (more than 200px)
        const verySignificantScrollUp =
          scrollTop < prevScrollTopRef.current - 100
        const veryFarFromBottom = scrollHeight - scrollTop - clientHeight > 200

        if (verySignificantScrollUp && contentUnchanged && veryFarFromBottom) {
          console.log("🔴 Manual scroll detected (streaming mode):", {
            scrollTop,
            prevScrollTop: prevScrollTopRef.current,
            isStreamingMode,
            contentUnchanged,
            distanceFromBottom: scrollHeight - scrollTop - clientHeight,
            verySignificantScrollUp,
            veryFarFromBottom,
          })
          userScrollingManualRef.current = true
          setTimeout(() => {
            userScrollingManualRef.current = false
            console.log("✅ Manual scroll flag cleared")
          }, 300) // Very short timeout during streaming
        }
      } else {
        // Normal mode - less restrictive
        const scrolledUp = scrollTop < prevScrollTopRef.current - 20
        if (scrolledUp && contentUnchanged) {
          console.log("🔴 Manual scroll detected (normal mode):", {
            scrollTop,
            prevScrollTop: prevScrollTopRef.current,
            isStreamingMode,
            contentUnchanged,
          })
          userScrollingManualRef.current = true
          setTimeout(() => {
            userScrollingManualRef.current = false
            console.log("✅ Manual scroll flag cleared")
          }, 1000)
        }
      }
    }

    // If user scrolled back to bottom, clear all manual scrolling flags more aggressively
    if (isBottom) {
      userScrollingManualRef.current = false
      userScrollingImageRef.current = false
      userScrollingKeyboardRef.current = false
    }

    setIsScrolledToBottom(isBottom)
    setShowScrollToBottom(!isBottom)

    const isNearTop = scrollTop < 50

    if (
      isNearTop &&
      scrollTop < prevScrollTopRef.current &&
      scrollHeightRef.current === scrollHeight
    ) {
      detectScrollToTop()
    }

    prevScrollTopRef.current = scrollTop
    scrollHeightRef.current = scrollHeight

    if (onScroll) {
      onScroll(e)
    }
  }

  useEffect(() => {
    // Detect if we're in streaming mode (content changing rapidly)
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current)
    }

    // Set streaming mode timeout - we're considered "streaming" for 2 seconds after content changes
    streamingTimeoutRef.current = setTimeout(() => {
      streamingTimeoutRef.current = null
    }, 5000) // Increased from 2000 to 5000 for longer streaming coverage

    // Auto-scroll if:
    // 1. We're at the bottom position OR very close to bottom (within 120px for streaming tolerance)
    // 2. User is not manually scrolling (no active scroll gestures)
    // 3. User hasn't recently scrolled away from bottom during streaming
    const scrollContainer = scrollContainerRef.current

    // Check current real-time scroll position instead of relying on state
    const currentDistanceFromBottom = scrollContainer
      ? scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight
      : 999

    const isAtBottom = currentDistanceFromBottom < 30
    const isNearBottom = currentDistanceFromBottom < 150 // Increased from 100 to 150

    // During streaming mode, be much more aggressive about auto-scrolling
    const isStreamingMode = streamingTimeoutRef.current !== null

    // During streaming mode, ignore manual scroll flag completely and be very aggressive
    const shouldAutoScroll =
      scrollContainer &&
      (isStreamingMode
        ? (isAtBottom || isNearBottom) &&
          !userScrollingImageRef.current &&
          !userScrollingKeyboardRef.current
        : (isAtBottom || isNearBottom) &&
          !userScrollingImageRef.current &&
          !userScrollingKeyboardRef.current &&
          !userScrollingManualRef.current)

    if (shouldAutoScroll) {
      console.log("📜 Auto-scrolling:", {
        isStreamingMode,
        isScrolledToBottom,
        isAtBottom,
        isNearBottom,
        currentDistanceFromBottom,
        manualFlag: userScrollingManualRef.current,
        imageFlag: userScrollingImageRef.current,
        keyboardFlag: userScrollingKeyboardRef.current,
      })
      scrollToBottom("auto") // Use "auto" for smoother streaming

      // Much more aggressive follow-up during streaming
      setTimeout(() => {
        // During streaming, ignore manual flag entirely in follow-ups
        const stillShouldAutoScroll = isStreamingMode
          ? !userScrollingImageRef.current && !userScrollingKeyboardRef.current
          : !userScrollingImageRef.current &&
            !userScrollingKeyboardRef.current &&
            !userScrollingManualRef.current

        if (stillShouldAutoScroll) {
          scrollToBottom("auto")

          // Extra persistence for streaming - multiple checks
          setTimeout(() => {
            const extraCheck = isStreamingMode
              ? !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current
              : !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current &&
                !userScrollingManualRef.current

            if (extraCheck) {
              scrollToBottom("auto")
            }
          }, 50)

          // Even more persistence during streaming - completely ignore manual flag
          if (isStreamingMode) {
            setTimeout(() => {
              if (
                !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current
              ) {
                scrollToBottom("auto")
              }
            }, 150)

            // Super aggressive final check for streaming
            setTimeout(() => {
              if (
                !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current
              ) {
                scrollToBottom("auto")
              }
            }, 300)

            // Additional longer delay for DOM settling
            setTimeout(() => {
              if (
                !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current
              ) {
                scrollToBottom("auto")
              }
            }, 500)

            setTimeout(() => {
              if (
                !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current
              ) {
                scrollToBottom("auto")
              }
            }, 800)
          }
        }
      }, 60) // Even faster response during streaming
    }

    if (onScrollComplete) {
      onScrollComplete()
    }
  }, [children, isScrolledToBottom, initialScrollBehavior, onScrollComplete])

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
            e.stopPropagation()
            e.preventDefault()
            // Clear all manual scrolling flags when user explicitly scrolls to bottom
            userScrollingManualRef.current = false
            userScrollingImageRef.current = false
            userScrollingKeyboardRef.current = false
            scrollToBottom()
          }}
          aria-label="Scroll to bottom"
          style={{
            visibility: "visible",
            display: "flex",
            pointerEvents: "auto",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
            touchAction: "none",
            fontSize: "var(--font-size-default)",
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
          }}
        >
          <ChevronDown size={18} />
        </button>
      )}
    </div>
  )
}

const ChatFeed = forwardRef(({}, ref) => {
  const {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useConversationHistory()
  const { showMemoryNetwork } = useMemoryNetwork()
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { isMobile } = usePlatform()
  const { syncsInProgress, checkStatuses } = useMemorySyncContext()

  const [messagesVisible, setMessagesVisible] = useState(false)
  const [shouldFetchNext, setShouldFetchNext] = useState(false)
  const initialRenderRef = useRef(true)
  const fetchingRef = useRef(false)
  const detectScrollToTopRef = useRef(null)
  const forceScrollToBottomRef = useRef(null)
  const previousMessageCountRef = useRef(0)
  const previousSyncCountRef = useRef(0)

  // Force scroll to bottom when new optimistic messages are added (user sending new message)
  useEffect(() => {
    const currentMessageCount = messages.length
    const previousMessageCount = previousMessageCountRef.current

    // Check if a new message was added (message count increased)
    if (currentMessageCount > previousMessageCount && currentMessageCount > 0) {
      // Check if the newest message (first in array) is optimistic
      const newestMessage = messages[0]
      const isNewOptimisticMessage = newestMessage?.isOptimistic === true

      if (isNewOptimisticMessage && forceScrollToBottomRef.current) {
        // Force scroll to bottom for new messages
        forceScrollToBottomRef.current()
        // Extra persistence for new messages
        setTimeout(() => {
          if (forceScrollToBottomRef.current) {
            forceScrollToBottomRef.current()
          }
        }, 200)
      }
    }

    // Update the previous message count
    previousMessageCountRef.current = currentMessageCount
  }, [messages])

  // Force scroll to bottom when sync indicators appear (if user is at bottom)
  useEffect(() => {
    const currentSyncCount = syncsInProgress.size
    const previousSyncCount = previousSyncCountRef.current

    // Check if a new sync started (sync count increased)
    if (
      currentSyncCount > previousSyncCount &&
      forceScrollToBottomRef.current
    ) {
      // Check if user is currently at or near bottom
      const scrollContainer = document.querySelector(".messages-scroll-view")
      if (scrollContainer) {
        const currentDistanceFromBottom =
          scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight

        // If user is at bottom (within 100px), auto-scroll to accommodate sync indicator
        if (currentDistanceFromBottom < 100) {
          console.log(
            "🔄 Sync indicator appeared, auto-scrolling to accommodate"
          )
          setTimeout(() => {
            if (forceScrollToBottomRef.current) {
              forceScrollToBottomRef.current()
            }
          }, 100) // Small delay to ensure indicator is rendered
        }
      }
    }

    // Update the previous sync count
    previousSyncCountRef.current = currentSyncCount
  }, [syncsInProgress])

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const messageIDs = messages
        .filter((msg) => !msg.isOptimistic && msg.response)
        .map((msg) => msg.id)
      if (messageIDs.length > 0) {
        checkStatuses(messageIDs)
      }
    }
  }, [isLoading, messages, checkStatuses])

  useEffect(() => {
    let isMounted = true

    if (!isLoading && messages.length > 0) {
      requestAnimationFrame(() => {
        if (!isMounted) return

        if (isMobile && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
          setTimeout(() => {
            if (isMounted) {
              setMessagesVisible(true)
              initialRenderRef.current = false
            }
          }, 200)
        } else {
          setMessagesVisible(true)
          initialRenderRef.current = false
        }
      })
    }

    return () => {
      isMounted = false
    }
  }, [isLoading, messages, isMobile])

  const handleScrollToTop = () => {
    if (
      hasNextPage &&
      !isLoading &&
      !isFetchingNextPage &&
      !fetchingRef.current
    ) {
      fetchingRef.current = true
      setShouldFetchNext(true)
    }
  }

  useEffect(() => {
    const fetchOlderMessages = async () => {
      if (!shouldFetchNext) return

      try {
        // Get initial scroll position
        const scrollContainer = document.querySelector(".messages-scroll-view")
        let prevHeight = 0

        if (scrollContainer) {
          prevHeight = scrollContainer.scrollHeight
        }

        // console.log("Fetching older messages...")
        await fetchNextPage()
        // console.log("Fetch complete")

        // Set a reasonable timeout to ensure DOM is updated
        setTimeout(() => {
          if (scrollContainer) {
            // Get the new scroll height and calculate difference
            const newHeight = scrollContainer.scrollHeight
            const heightDifference = newHeight - prevHeight

            // Position just below the new content
            // This is the key implementation from main branch that works correctly
            if (heightDifference > 0) {
              scrollContainer.scrollTop = heightDifference
            }
          }

          fetchingRef.current = false
          setShouldFetchNext(false)
        }, 150)
      } catch (error) {
        console.error("Error loading more messages:", error)
        fetchingRef.current = false
        setShouldFetchNext(false)
      }
    }

    if (shouldFetchNext) {
      fetchOlderMessages()
    }
  }, [shouldFetchNext, fetchNextPage])

  const handleCopy = (message, type = "prompt") => {
    const textToCopy = type === "prompt" ? message.prompt : message.response
    if (!textToCopy) {
      toast.error("No content to copy")
      return
    }

    navigator.clipboard.writeText(textToCopy).then(
      () => {
        toast.success("Copied to clipboard")
      },
      (err) => {
        console.error("Could not copy text: ", err)
        toast.error("Failed to copy text")
      }
    )
  }

  const handleMessageDelete = async (message) => {
    if (!message.id) {
      console.error("Cannot delete message: missing ID")
      toast.error("Failed to delete message")
      return
    }
    try {
      confirmMemoryDeletion(message.id, {
        onSuccess: () => {
          refetch()
        },
      })
    } catch (error) {
      console.error("Error deleting message:", error)
      toast.error("Failed to delete message")
    }
  }

  const handleShowMemories = async (message) => {
    try {
      await showMemoryNetwork(message)
    } catch (error) {
      console.error("Error showing memory network:", error)
      toast.error("Failed to show memory network")
    }
  }

  // Use the externally passed ref for scroll position detection
  useEffect(() => {
    if (ref) {
      // If a ref is passed from parent, use it to access internal scrolling functionality
      if (typeof ref === "function") {
        // Function refs get called with the DOM element
        ref(detectScrollToTopRef.current)
      } else if (ref.current !== undefined) {
        // Object refs need their .current property assigned
        ref.current = detectScrollToTopRef.current
      }
    }
  }, [ref])

  return (
    <div className="chat-feed-container">
      {isFetchingNextPage && (
        <div
          className="loading-indicator"
          style={{ position: "sticky", top: 0, zIndex: 10 }}
        >
          <div className="loading-spinner"></div>
          <div>Loading more messages...</div>
        </div>
      )}

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
          forceScrollToBottomRef={forceScrollToBottomRef}
          style={{
            opacity: messagesVisible ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          {messages
            .map((message, index) => {
              const isUser =
                message.prompt && !message.prompt.includes("SYSTEM:")
              const isLast = index === messages.length - 1

              const syncState = syncsInProgress.get(message.id)
              const showSync = !!syncState
              const syncStage = syncState?.stage || 1

              return (
                <div key={message.id || index} className="message-pair">
                  {message.prompt && isUser && (
                    <ChatMessage
                      content={message.prompt}
                      timestamp={
                        message.timestamp
                          ? new Date(message.timestamp).getTime()
                          : Date.now()
                      }
                      isUser={true}
                      isLast={isLast}
                      isOptimistic={message.isOptimistic}
                      menuProps={{
                        id: message.id,
                        onCopy: () => handleCopy(message, "prompt"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
                      showSyncIndicator={showSync}
                      syncStage={syncStage}
                    />
                  )}

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
                      isOptimistic={message.isOptimistic}
                      menuProps={{
                        id: message.id,
                        onCopy: () => handleCopy(message, "response"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
                      showSyncIndicator={showSync}
                      syncStage={syncStage}
                    />
                  )}
                </div>
              )
            })
            .reverse()}
        </CustomScrollToBottom>
      ) : (
        <div className="empty-chat-message">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
    </div>
  )
})

ChatFeed.displayName = "ChatFeed"
export default ChatFeed
