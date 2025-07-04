import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  RefObject,
  ReactNode,
  CSSProperties,
  useCallback,
  useMemo,
} from "react"
import "./ChatFeed.css"
import { ChevronDown } from "lucide-react"
import { useMemoryDeletion } from "../hooks/useMemoryDeletion"
import { toast } from "sonner"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { usePlatform } from "@/hooks/usePlatform"
import { useMemorySyncContext } from "@/contexts/MemorySyncContext"
import ChatMessage from "./ChatMessage"
import { Memory } from "@/api/getMemories"

// Performance and accessibility constants
const SCROLL_CONSTANTS = {
  SCROLL_BOTTOM_THRESHOLD: 30,
  SCROLL_TOP_THRESHOLD: 50,
  SCROLL_DELAY: 50,
  SCROLL_TIMEOUT: 100,
  SCROLL_DEBOUNCE: 200,
  KEYBOARD_DEBOUNCE: 150,
  KEYBOARD_MIN_HEIGHT: 200,
  VIEWPORT_SCROLL_RATIO: 0.7,
  MESSAGES_FADE_DELAY: 200,
  FETCH_DELAY: 150,
  ANIMATION_FRAME_DELAY: 16, // ~60fps
} as const

interface OptimisticMemory extends Memory {
  isOptimistic?: boolean
  streamingResponse?: string
  imageURL?: string
}

interface CustomScrollToBottomProps {
  children: ReactNode
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  onScrollComplete?: () => void
  className?: string
  style?: CSSProperties
  scrollViewClassName?: string
  initialScrollBehavior?: ScrollBehavior
  detectScrollToTop?: () => void
  onScrollToTopRef?: RefObject<(() => void) | null>
  messages?: OptimisticMemory[]
  isStreaming?: boolean
}

interface ChatFeedProps {
  // Future props can be added here
}

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
  messages = [],
  isStreaming = false,
}: CustomScrollToBottomProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const followButtonRef = useRef<HTMLButtonElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const isInitialScrollRef = useRef(true)
  const prevScrollTopRef = useRef(0)
  const scrollHeightRef = useRef(0)
  const prevMessagesLengthRef = useRef(0)
  const userScrollingImageRef = useRef(false)
  const userScrollingKeyboardRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const imageObserverRef = useRef<MutationObserver | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current

    // Use requestAnimationFrame for better performance
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: behavior,
      })
    })
  }, [])

  // ChatGPT-style scroll: Jump to show user message with space below
  const scrollToUserMessage = useCallback(() => {
    if (!scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    const containerHeight = scrollContainer.clientHeight

    // Position scroll to show roughly 1/3 of the container height from bottom
    // This creates space for the incoming response
    const targetScrollTop = scrollContainer.scrollHeight - containerHeight * SCROLL_CONSTANTS.VIEWPORT_SCROLL_RATIO

    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: "smooth",
    })
  }, [])

  // Consolidated timeout management
  const addTimeout = useCallback((timeout: ReturnType<typeof setTimeout>) => {
    timeoutRefs.current.add(timeout)
  }, [])

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
    timeoutRefs.current.clear()
  }, [])

  useEffect(() => {
    if (onScrollToTopRef) {
      onScrollToTopRef.current = detectScrollToTop
    }

    if (scrollContainerRef.current) {
      if (isInitialScrollRef.current) {
        scrollToBottom(initialScrollBehavior)
        isInitialScrollRef.current = false
      }

      let scrollTimer: ReturnType<typeof setTimeout> | null = null

      const trackUserScrolling = () => {
        userScrollingImageRef.current = true
        if (scrollTimer) clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
          userScrollingImageRef.current = false
        }, SCROLL_CONSTANTS.SCROLL_DEBOUNCE)
      }

      const currentScrollContainer = scrollContainerRef.current

      if (currentScrollContainer) {
        currentScrollContainer.addEventListener("scroll", trackUserScrolling)
      }

      const handleImageLoad = () => {
        if (isScrolledToBottom && !userScrollingImageRef.current) {
          const timeout = setTimeout(() => scrollToBottom("auto"), SCROLL_CONSTANTS.SCROLL_DELAY)
          addTimeout(timeout)
        }
      }

      // Use MutationObserver for better image management
      const setupImageObserver = () => {
        if (imageObserverRef.current) {
          imageObserverRef.current.disconnect()
        }

        imageObserverRef.current = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element
                  const images = element.querySelectorAll ? element.querySelectorAll('img') : []
                  images.forEach((img) => {
                    if (!img.complete) {
                      img.addEventListener('load', handleImageLoad, { once: true })
                    }
                  })
                }
              })
            }
          })
        })

        imageObserverRef.current.observe(currentScrollContainer, {
          childList: true,
          subtree: true
        })
      }

      // Initial image setup
      const images = currentScrollContainer.querySelectorAll("img")
      images.forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", handleImageLoad, { once: true })
        }
      })

      setupImageObserver()

      return () => {
        if (currentScrollContainer) {
          currentScrollContainer.removeEventListener(
            "scroll",
            trackUserScrolling
          )
        }
        if (scrollTimer) clearTimeout(scrollTimer)
        if (imageObserverRef.current) {
          imageObserverRef.current.disconnect()
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        clearAllTimeouts()
      }
    }
  }, [
    detectScrollToTop,
    initialScrollBehavior,
    isScrolledToBottom,
    onScrollToTopRef,
    scrollToBottom,
    addTimeout,
    clearAllTimeouts,
  ])

  useEffect(() => {
    const initialHeight = window.innerHeight
    let isKeyboardVisible = false
    let previousDiff = 0
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null

    const setScrolling = () => {
      userScrollingKeyboardRef.current = true
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        userScrollingKeyboardRef.current = false
      }, SCROLL_CONSTANTS.KEYBOARD_DEBOUNCE)
    }

    const currentScrollContainer = scrollContainerRef.current

    if (currentScrollContainer) {
      currentScrollContainer.addEventListener("scroll", setScrolling)
    }

    const handleResize = () => {
      if (userScrollingKeyboardRef.current) return

      const currentHeight = window.innerHeight
      const heightDiff = initialHeight - currentHeight

      if (Math.abs(heightDiff - previousDiff) < SCROLL_CONSTANTS.SCROLL_BOTTOM_THRESHOLD) return
      previousDiff = heightDiff

      if (heightDiff > SCROLL_CONSTANTS.KEYBOARD_MIN_HEIGHT) {
        if (!isKeyboardVisible) {
          isKeyboardVisible = true

          // Use ref instead of document.querySelector for better performance
          const button = followButtonRef.current
          if (button) {
            button.style.bottom = `${heightDiff + 20}px`
            button.style.transition = "bottom 0.2s ease-out"
          }

          if (isScrolledToBottom) {
            const timeout = setTimeout(() => scrollToBottom("auto"), SCROLL_CONSTANTS.SCROLL_TIMEOUT)
            addTimeout(timeout)
          }
        }
      } else {
        if (isKeyboardVisible) {
          isKeyboardVisible = false

          // Use ref instead of document.querySelector for better performance
          const button = followButtonRef.current
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
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [isScrolledToBottom, scrollToBottom, addTimeout])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    const scrollTop = scrollContainer.scrollTop
    const scrollHeight = scrollContainer.scrollHeight
    const clientHeight = scrollContainer.clientHeight

    const isBottom = scrollHeight - scrollTop - clientHeight < SCROLL_CONSTANTS.SCROLL_BOTTOM_THRESHOLD
    setIsScrolledToBottom(isBottom)
    setShowScrollToBottom(!isBottom)

    const isNearTop = scrollTop < SCROLL_CONSTANTS.SCROLL_TOP_THRESHOLD

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
  }, [detectScrollToTop, onScroll])

  // ChatGPT-style autoscroll behavior
  useEffect(() => {
    if (!scrollContainerRef.current) return

    const currentMessagesLength = messages.length
    const previousMessagesLength = prevMessagesLengthRef.current

    // Only trigger special scroll behavior when new messages are added
    if (currentMessagesLength > previousMessagesLength) {
      const newMessages = messages.slice(
        0,
        currentMessagesLength - previousMessagesLength
      )
      const hasNewUserMessage = newMessages.some((msg) => {
        return msg.prompt && !msg.prompt.includes("SYSTEM:")
      })

      if (hasNewUserMessage && !isStreaming) {
        // ChatGPT-style: Jump scroll to show user message with space below
        const timeout = setTimeout(() => scrollToUserMessage(), SCROLL_CONSTANTS.SCROLL_TIMEOUT)
        addTimeout(timeout)
      }
    }

    prevMessagesLengthRef.current = currentMessagesLength

    if (onScrollComplete) {
      onScrollComplete()
    }
  }, [messages, isStreaming, onScrollComplete, scrollToUserMessage, addTimeout])

  return (
    <div className={containerClassName} style={containerStyle}>
      <div
        ref={scrollContainerRef}
        className={scrollViewClassName || "custom-scroll-view"}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
        tabIndex={0}
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
          ref={followButtonRef}
          className="follow-button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            scrollToBottom()
          }}
          aria-label="Scroll to bottom of conversation"
          type="button"
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
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

const ChatFeed = forwardRef<(() => void) | null, ChatFeedProps>(({}, ref) => {
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
  const detectScrollToTopRef = useRef<(() => void) | null>(null)

  // Check if any message is currently streaming
  const isStreaming = messages.some(
    (msg) => msg.isOptimistic && msg.streamingResponse !== undefined
  )

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
          }, SCROLL_CONSTANTS.MESSAGES_FADE_DELAY)
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
        // Use ref instead of document.querySelector for better performance
        const scrollContainer = document.querySelector(
          ".messages-scroll-view"
        ) as HTMLElement
        let prevHeight = 0

        if (scrollContainer) {
          prevHeight = scrollContainer.scrollHeight
        }

        await fetchNextPage()

        setTimeout(() => {
          if (scrollContainer) {
            const newHeight = scrollContainer.scrollHeight
            const heightDifference = newHeight - prevHeight

            if (heightDifference > 0) {
              scrollContainer.scrollTop = heightDifference
            }
          }

          fetchingRef.current = false
          setShouldFetchNext(false)
        }, SCROLL_CONSTANTS.FETCH_DELAY)
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

  const handleCopy = (
    message: OptimisticMemory,
    type: "prompt" | "response" = "prompt"
  ) => {
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

  const handleMessageDelete = async (message: OptimisticMemory) => {
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

  const handleShowMemories = async (message: OptimisticMemory) => {
    try {
      await showMemoryNetwork(message)
    } catch (error) {
      console.error("Error showing memory network:", error)
      toast.error("Failed to show memory network")
    }
  }

  useEffect(() => {
    if (ref) {
      if (typeof ref === "function") {
        ref(detectScrollToTopRef.current)
      } else if (ref.current !== undefined) {
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
          messages={messages}
          isStreaming={isStreaming}
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
