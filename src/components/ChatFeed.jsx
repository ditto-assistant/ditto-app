import { useEffect, useRef, useState, forwardRef } from "react"
import "./ChatFeed.css"
import { ChevronDown, MessageSquarePlus, Clock } from "lucide-react"
import { useMemoryDeletion } from "../hooks/useMemoryDeletion"
import { toast } from "sonner"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { usePlatform } from "@/hooks/usePlatform"
import { useSessionManager } from "@/hooks/useSessionManager"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    messages, // Now expects flat array of conversations with sessionID property
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useConversationHistory()
  const { showMemoryNetwork } = useMemoryNetwork()
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { isMobile } = usePlatform()
  const {
    currentSessionId,
    hasRecentSessions,
    startNewSession,
    resumeLatestSession,
    isLoadingSessions,
  } = useSessionManager()
  const [messagesVisible, setMessagesVisible] = useState(false)
  const [shouldFetchNext, setShouldFetchNext] = useState(false)
  const [showSessionSelection, setShowSessionSelection] = useState(true)
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
    let textToCopy

    if (type === "prompt" || type === "input") {
      // Handle v3 input content arrays
      if (message.input && Array.isArray(message.input)) {
        textToCopy = message.input
          .filter((content) => content.type === "text")
          .map((content) => content.text)
          .join(" ")
      } else {
        // Fallback to legacy prompt field
        textToCopy = message.prompt
      }
    } else if (type === "response" || type === "output") {
      // Handle v3 output content arrays
      if (message.output && Array.isArray(message.output)) {
        textToCopy = message.output
          .filter((content) => content.type === "text")
          .map((content) => content.text)
          .join(" ")
      } else if (
        message.streamingOutput &&
        Array.isArray(message.streamingOutput)
      ) {
        textToCopy = message.streamingOutput
          .filter((content) => content.type === "text")
          .map((content) => content.text)
          .join(" ")
      } else {
        // Fallback to legacy response field
        textToCopy = message.response
      }
    }

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

  // Function to get session background color based on session ID
  const getSessionBackgroundColor = (sessionID) => {
    if (!sessionID || sessionID === "default") return null

    // Hash the session ID to get a consistent color index
    let hash = 0
    for (let i = 0; i < sessionID.length; i++) {
      const char = sessionID.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    // Use modulo to get a color index between 1-8
    const colorIndex = (Math.abs(hash) % 8) + 1
    return `var(--session-bg-${colorIndex})`
  }

  // Helper function to convert content array to string for display
  const contentArrayToText = (contentArray) => {
    if (!contentArray || !Array.isArray(contentArray)) return ""

    return contentArray
      .map((item) => {
        if (!item || typeof item !== "object") {
          return ""
        }

        if (item.type === "text") {
          return typeof item.text === "string" ? item.text : ""
        } else if (item.type === "image") {
          return item.imageURL ? `![Image](${item.imageURL})` : "[Image]"
        } else if (item.type === "tool_call") {
          return `🛠️ **${item.toolName || "Tool"}**: ${item.toolCallID || "Running..."}`
        } else if (item.type === "tool_result") {
          const output = item.toolOutput || {}
          const resultText =
            typeof output === "object"
              ? JSON.stringify(output, null, 2)
              : String(output)
          return `✅ **Tool Result**: ${resultText}`
        }
        return ""
      })
      .filter(Boolean)
      .join("\n\n")
      .trim()
  }

  // Helper function to extract images from content array
  const extractImagesFromContent = (contentArray) => {
    if (!contentArray || !Array.isArray(contentArray)) return []
    return contentArray
      .filter((content) => content.type === "image" && content.imageURL)
      .map((content) => content.imageURL)
  }

  // Show session selection when there's no active session
  useEffect(() => {
    const shouldShowSelection = !currentSessionId && !isLoadingSessions
    setShowSessionSelection(shouldShowSelection)
  }, [currentSessionId, isLoadingSessions])

  const handleNewSession = () => {
    startNewSession()
    setShowSessionSelection(false)
  }

  const handleResumeLatest = () => {
    resumeLatestSession()
    setShowSessionSelection(false)
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

      {/* Session Selection UI */}
      {showSessionSelection && !isLoading && !isLoadingSessions && (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Welcome back!</h2>
                <p className="text-muted-foreground">
                  How would you like to continue?
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleNewSession}
                  className="w-full justify-start h-12"
                  variant="default"
                >
                  <MessageSquarePlus className="mr-3 h-5 w-5" />
                  Start New Session
                </Button>

                {hasRecentSessions && (
                  <Button
                    onClick={handleResumeLatest}
                    className="w-full justify-start h-12"
                    variant="outline"
                  >
                    <Clock className="mr-3 h-5 w-5" />
                    Pick Up Where You Left Off
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!showSessionSelection && (isLoading || isLoadingSessions) ? (
        <div className="empty-chat-message">
          <div className="loading-spinner"></div>
          <p>Loading conversation...</p>
        </div>
      ) : !showSessionSelection && messages && messages.length > 0 ? (
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
              // Determine if message is from user
              let isUser = false
              let userContent = ""
              let assistantContent = ""
              let userImages = []
              let assistantImages = []

              // Handle v3 format with input/output arrays
              if (message.input && Array.isArray(message.input)) {
                userContent = contentArrayToText(message.input)
                userImages = extractImagesFromContent(message.input)
                isUser =
                  userContent.length > 0 && !userContent.includes("SYSTEM:")
              } else if (message.prompt) {
                // Fallback to legacy format
                userContent = message.prompt
                isUser = userContent && !userContent.includes("SYSTEM:")
                if (message.imageURL) {
                  userImages = [message.imageURL]
                }
              }

              // Handle assistant content
              if (message.output && Array.isArray(message.output)) {
                assistantContent = contentArrayToText(message.output)
                assistantImages = extractImagesFromContent(message.output)
              } else if (
                message.streamingOutput &&
                Array.isArray(message.streamingOutput)
              ) {
                assistantContent = contentArrayToText(message.streamingOutput)
                assistantImages = extractImagesFromContent(
                  message.streamingOutput
                )
              } else if (message.response) {
                // Fallback to legacy format
                assistantContent = message.response
              }

              // Handle legacy streaming response format
              if (message.streamingResponse && !assistantContent) {
                assistantContent = message.streamingResponse
              }

              const isLast = index === messages.length - 1

              // Check if this message starts a new session (different sessionID from previous message)
              const prevMessage = index > 0 ? messages[index - 1] : null
              const isNewSession =
                prevMessage &&
                message.sessionID &&
                message.sessionID !== "default" &&
                prevMessage.sessionID !== message.sessionID
              const sessionBgColor = getSessionBackgroundColor(
                message.sessionID
              )

              return (
                <div key={message.id || index}>
                  {/* Session divider for new sessions */}
                  {isNewSession && (
                    <div className="session-divider my-6">
                      <div className="flex items-center justify-center relative">
                        <div className="relative bg-background/80 backdrop-blur-sm px-4 py-2 text-xs font-medium text-muted-foreground rounded-full">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                            New Session
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`message-pair ${message.sessionID && message.sessionID !== "default" ? "in-session" : "no-session"}`}
                    style={
                      sessionBgColor ? { backgroundColor: sessionBgColor } : {}
                    }
                  >
                    {userContent && isUser && (
                      <ChatMessage
                        key={`${message.id}-user-${userContent.length}`}
                        content={userContent}
                        contentArray={message.input}
                        images={userImages}
                        timestamp={
                          message.timestamp
                            ? new Date(message.timestamp).getTime()
                            : Date.now()
                        }
                        isUser={true}
                        isLast={isLast}
                        isOptimistic={message.isOptimistic}
                        menuProps={{
                          onCopy: () => handleCopy(message, "input"),
                          onDelete: () => handleMessageDelete(message),
                          onShowMemories: () => handleShowMemories(message),
                        }}
                      />
                    )}

                    {assistantContent && (
                      <ChatMessage
                        key={`${message.id}-assistant-${assistantContent.length}`}
                        content={assistantContent}
                        contentArray={message.output || message.streamingOutput}
                        images={assistantImages}
                        subAgents={message.subAgents}
                        timestamp={
                          message.timestamp
                            ? new Date(message.timestamp).getTime()
                            : Date.now()
                        }
                        isUser={false}
                        isLast={isLast}
                        isOptimistic={message.isOptimistic}
                        menuProps={{
                          onCopy: () => handleCopy(message, "output"),
                          onDelete: () => handleMessageDelete(message),
                          onShowMemories: () => handleShowMemories(message),
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })
            .reverse()}
        </CustomScrollToBottom>
      ) : !showSessionSelection ? (
        <div className="empty-chat-message">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : null}
    </div>
  )
})

ChatFeed.displayName = "ChatFeed"
export default ChatFeed
