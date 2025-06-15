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
import SyncIndicator from "./SyncIndicator"

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

    setTimeout(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: behavior,
      })
    }, 50)
  }

  const userScrollingImageRef = useRef(false)
  const userScrollingKeyboardRef = useRef(false)

  useEffect(() => {
    if (onScrollToTopRef) {
      onScrollToTopRef.current = detectScrollToTop
    }

    if (scrollContainerRef.current) {
      if (isInitialScrollRef.current) {
        scrollToBottom(initialScrollBehavior)
        isInitialScrollRef.current = false
      }

      let scrollTimer = null

      const trackUserScrolling = () => {
        userScrollingImageRef.current = true
        clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
          userScrollingImageRef.current = false
        }, 200)
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
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        userScrollingKeyboardRef.current = false
      }, 150)
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

    const isBottom = scrollHeight - scrollTop - clientHeight < 30
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
    if (scrollContainerRef.current && isScrolledToBottom) {
      scrollToBottom(initialScrollBehavior)

      setTimeout(() => {
        if (isScrolledToBottom) {
          scrollToBottom(initialScrollBehavior)
        }
      }, 300)
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
  const { isSyncing, currentStage, completeSyncIndicator } = useMemorySyncContext()
  
  // Debug what ChatFeed is actually receiving
  console.log("📱 [ChatFeed] RENDER - received isSyncing from context:", isSyncing, "stage:", currentStage)

  // Debug sync state changes
  useEffect(() => {
    console.log("📱 [ChatFeed] Sync state changed:", { isSyncing, currentStage })
    if (isSyncing) {
      console.log(`📱 [ChatFeed] SyncIndicator should be visible now, showing stage ${currentStage}/4!`)
    } else {
      console.log("📱 [ChatFeed] SyncIndicator should be hidden now!")
    }
  }, [isSyncing, currentStage])
  const [messagesVisible, setMessagesVisible] = useState(false)
  const [shouldFetchNext, setShouldFetchNext] = useState(false)
  const initialRenderRef = useRef(true)
  const fetchingRef = useRef(false)
  const detectScrollToTopRef = useRef(null)

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
                        onCopy: () => handleCopy(message, "prompt"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
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
                        onCopy: () => handleCopy(message, "response"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
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

      {/* Sync Indicator - positioned at bottom above SendMessage */}
      <SyncIndicator 
        isVisible={isSyncing} 
        currentStage={currentStage}
        onComplete={completeSyncIndicator}
      />
    </div>
  )
})

ChatFeed.displayName = "ChatFeed"
export default ChatFeed
