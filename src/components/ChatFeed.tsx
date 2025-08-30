import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
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
import { useReducedMotion } from "@/hooks/useReducedMotion"
import ChatMessage from "./ChatMessage"

// Import constants and types
import {
  SCROLL_CONSTANTS,
  UI_CONSTANTS,
  A11Y_CONSTANTS,
} from "./ChatFeed/constants"
import type {
  CustomScrollToBottomProps,
  ChatFeedProps,
  ScrollBehavior,
  ForceScrollFunction,
  ScrollDetectionFunction,
} from "./ChatFeed/types"

// Custom hook for timeout cleanup management
function useTimeoutCleanup() {
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set())

  const addTimeout = useCallback((timeout: NodeJS.Timeout) => {
    timeoutsRef.current.add(timeout)
  }, [])

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    timeoutsRef.current.clear()
  }, [])

  useEffect(() => {
    return () => {
      clearAllTimeouts()
    }
  }, [clearAllTimeouts])

  return { addTimeout, clearAllTimeouts }
}

// Custom hook for scroll state management
function useScrollState() {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)

  // Consolidated scroll flags
  const userScrollingImageRef = useRef(false)
  const userScrollingKeyboardRef = useRef(false)
  const userScrollingManualRef = useRef(false)
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll position tracking
  const isInitialScrollRef = useRef(true)
  const prevScrollTopRef = useRef(0)
  const scrollHeightRef = useRef(0)

  return {
    showScrollToBottom,
    setShowScrollToBottom,
    isScrolledToBottom,
    setIsScrolledToBottom,
    userScrollingImageRef,
    userScrollingKeyboardRef,
    userScrollingManualRef,
    streamingTimeoutRef,
    isInitialScrollRef,
    prevScrollTopRef,
    scrollHeightRef,
  }
}

const CustomScrollToBottom: React.FC<CustomScrollToBottomProps> = ({
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
  scrollContainerRefExternal,
  messages = [],
  onManualScrollStateChange, // Add callback to expose manual scroll state
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollButtonRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const { addTimeout, clearAllTimeouts } = useTimeoutCleanup()

  const {
    showScrollToBottom,
    setShowScrollToBottom,
    isScrolledToBottom,
    setIsScrolledToBottom,
    userScrollingImageRef,
    userScrollingKeyboardRef,
    userScrollingManualRef,
    streamingTimeoutRef,
    isInitialScrollRef,
    prevScrollTopRef,
    scrollHeightRef,
  } = useScrollState()

  // Define clearAllScrollFlags inside this component to access onManualScrollStateChange
  const clearAllScrollFlags = useCallback(() => {
    userScrollingManualRef.current = false
    userScrollingImageRef.current = false
    userScrollingKeyboardRef.current = false
    // Notify parent that manual scrolling has stopped
    onManualScrollStateChange?.(false)
  }, [
    onManualScrollStateChange,
    userScrollingManualRef,
    userScrollingImageRef,
    userScrollingKeyboardRef,
  ])

  const rafIdRef = useRef<number | null>(null)
  const cancelRaf = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (!scrollContainerRef.current) return

      const scrollContainer = scrollContainerRef.current

      // Respect reduced motion preference
      const effectiveBehavior = prefersReducedMotion ? "auto" : behavior

      // For immediate scrolling during streaming, reduce timeout
      const delay =
        effectiveBehavior === "auto"
          ? SCROLL_CONSTANTS.IMMEDIATE_SCROLL_DELAY
          : SCROLL_CONSTANTS.STANDARD_SCROLL_DELAY

      const timeout = setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: effectiveBehavior,
        })
      }, delay)

      addTimeout(timeout)
    },
    [prefersReducedMotion, addTimeout]
  )

  // Expose force scroll function to parent
  const forceScrollToBottom: ForceScrollFunction = useCallback(() => {
    // Only clear manual scrolling flags if user hasn't intentionally scrolled up
    // This allows users to interrupt auto-scroll during streaming
    if (!userScrollingManualRef.current) {
      clearAllScrollFlags()
    } else {
      return
    }

    // Force scroll to bottom immediately, but only if user hasn't manually scrolled up
    if (scrollContainerRef.current && !userScrollingManualRef.current) {
      const timeout1 = setTimeout(
        () => scrollToBottom("auto"),
        SCROLL_CONSTANTS.STANDARD_SCROLL_DELAY
      )
      const timeout2 = setTimeout(
        () => scrollToBottom("auto"),
        SCROLL_CONSTANTS.INITIAL_SCROLL_DELAY + 50
      )
      const timeout3 = setTimeout(
        () => scrollToBottom("auto"),
        SCROLL_CONSTANTS.INITIAL_SCROLL_DELAY * 3
      )

      addTimeout(timeout1)
      addTimeout(timeout2)
      addTimeout(timeout3)
    }
  }, [scrollToBottom, clearAllScrollFlags, addTimeout, userScrollingManualRef])

  useEffect(() => {
    if (onScrollToTopRef) {
      onScrollToTopRef.current = detectScrollToTop
    }

    if (forceScrollToBottomRef) {
      forceScrollToBottomRef.current = forceScrollToBottom
    }

    // expose internal scroll container to parent
    if (scrollContainerRefExternal) {
      scrollContainerRefExternal.current = scrollContainerRef.current
    }

    if (scrollContainerRef.current) {
      if (isInitialScrollRef.current) {
        // Force immediate scroll to bottom on initial load
        scrollToBottom("auto")
        // Double-check to ensure we're fully at bottom
        const timeout = setTimeout(
          () => scrollToBottom("auto"),
          SCROLL_CONSTANTS.INITIAL_SCROLL_DELAY
        )
        addTimeout(timeout)
        isInitialScrollRef.current = false
      }

      let scrollTimer: NodeJS.Timeout | null = null

      const trackUserScrolling = () => {
        userScrollingImageRef.current = true
        userScrollingManualRef.current = true
        if (scrollTimer) clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
          userScrollingImageRef.current = false
          userScrollingManualRef.current = false
        }, SCROLL_CONSTANTS.USER_SCROLL_TIMEOUT)
      }

      // Store the ref value in a variable to avoid issues in cleanup function
      const currentScrollContainer = scrollContainerRef.current

      if (currentScrollContainer) {
        currentScrollContainer.addEventListener("scroll", trackUserScrolling)
      }

      const handleImageLoad = () => {
        if (isScrolledToBottom && !userScrollingImageRef.current) {
          const timeout = setTimeout(
            () => scrollToBottom("auto"),
            SCROLL_CONSTANTS.STANDARD_SCROLL_DELAY
          )
          addTimeout(timeout)
        }
      }

      const images = currentScrollContainer?.querySelectorAll("img") || []
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
        if (scrollTimer) clearTimeout(scrollTimer)
      }
    }

    // Cleanup streaming timeout on unmount
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    detectScrollToTop,
    initialScrollBehavior,
    isScrolledToBottom,
    onScrollToTopRef,
    forceScrollToBottom,
    scrollToBottom,
    addTimeout,
    scrollContainerRefExternal,
    // Refs are intentionally omitted to prevent infinite re-renders
  ])

  useEffect(() => {
    const initialHeight = window.innerHeight
    let isKeyboardVisible = false
    let previousDiff = 0
    let scrollTimeout: NodeJS.Timeout | null = null

    const setScrolling = () => {
      userScrollingKeyboardRef.current = true
      userScrollingManualRef.current = true
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        userScrollingKeyboardRef.current = false
        userScrollingManualRef.current = false
      }, SCROLL_CONSTANTS.USER_SCROLL_TIMEOUT)
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

      if (
        Math.abs(heightDiff - previousDiff) <
        SCROLL_CONSTANTS.KEYBOARD_HEIGHT_CHANGE_THRESHOLD
      )
        return
      previousDiff = heightDiff

      if (heightDiff > SCROLL_CONSTANTS.MIN_KEYBOARD_HEIGHT) {
        if (!isKeyboardVisible) {
          isKeyboardVisible = true

          // Use ref instead of DOM query
          const button = scrollButtonRef.current
          if (button) {
            button.style.bottom = `${heightDiff + UI_CONSTANTS.KEYBOARD_BUTTON_OFFSET}px`
            button.style.transition = UI_CONSTANTS.BUTTON_TRANSITION_UP
          }

          if (isScrolledToBottom) {
            const timeout = setTimeout(
              () => scrollToBottom("auto"),
              SCROLL_CONSTANTS.KEYBOARD_SCROLL_DELAY
            )
            addTimeout(timeout)
          }
        }
      } else {
        if (isKeyboardVisible) {
          isKeyboardVisible = false

          // Use ref instead of DOM query
          const button = scrollButtonRef.current
          if (button) {
            button.style.bottom = ""
            button.style.transition = UI_CONSTANTS.BUTTON_TRANSITION_DOWN
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrolledToBottom, scrollToBottom, addTimeout])
  // Refs are intentionally omitted to prevent infinite re-renders

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!scrollContainerRef.current) return

      const scrollContainer = scrollContainerRef.current
      const scrollTop = scrollContainer.scrollTop
      const scrollHeight = scrollContainer.scrollHeight
      const clientHeight = scrollContainer.clientHeight

      const isBottom =
        scrollHeight - scrollTop - clientHeight <
        SCROLL_CONSTANTS.DISTANCE_FROM_BOTTOM_TOLERANCE

      // Detect scroll direction change more immediately
      const scrollDirection =
        scrollTop > prevScrollTopRef.current ? "down" : "up"
      const isStreamingMode = streamingTimeoutRef.current !== null

      // Only mark as manual scrolling if:
      // 1. User scrolled away from bottom AND
      // 2. The scroll position actually decreased significantly (user scrolled up) AND
      // 3. Content hasn't changed AND we're not in streaming mode
      if (!isBottom && isScrolledToBottom) {
        const contentUnchanged = scrollHeight === scrollHeightRef.current

        // During streaming mode, be EXTREMELY restrictive about manual scroll detection
        if (isStreamingMode) {
          // During streaming, be more responsive to user scrolling to allow interruption
          // 1. User scrolled up by more than threshold
          // 2. AND they're currently away from bottom
          const significantScrollUp =
            scrollTop <
            prevScrollTopRef.current - SCROLL_CONSTANTS.SIGNIFICANT_SCROLL_UP
          const awayFromBottom =
            scrollHeight - scrollTop - clientHeight >
            SCROLL_CONSTANTS.DISTANCE_FROM_BOTTOM_TOLERANCE

          if (significantScrollUp && awayFromBottom) {
            userScrollingManualRef.current = true
            // Notify parent of manual scroll state change
            onManualScrollStateChange?.(true)

            // If we're in streaming mode, clear the streaming timeout to give user full control
            if (isStreamingMode && streamingTimeoutRef.current) {
              clearTimeout(streamingTimeoutRef.current)
              streamingTimeoutRef.current = null
            }

            // During streaming, don't auto-clear the manual scroll flag
            // User must explicitly resume by scrolling to bottom or clicking button
            if (!isStreamingMode) {
              const timeout = setTimeout(() => {
                userScrollingManualRef.current = false
                // Notify parent of manual scroll state change
                onManualScrollStateChange?.(false)
              }, SCROLL_CONSTANTS.MANUAL_SCROLL_CLEAR_TIMEOUT)
              addTimeout(timeout)
            }
          }
        } else {
          // Normal mode - less restrictive
          const scrolledUp =
            scrollTop <
            prevScrollTopRef.current - SCROLL_CONSTANTS.SIGNIFICANT_SCROLL_UP
          if (scrolledUp && contentUnchanged) {
            userScrollingManualRef.current = true
            // Notify parent of manual scroll state change
            onManualScrollStateChange?.(true)
            const timeout = setTimeout(() => {
              userScrollingManualRef.current = false
              // Notify parent of manual scroll state change
              onManualScrollStateChange?.(false)
            }, SCROLL_CONSTANTS.MANUAL_SCROLL_CLEAR_TIMEOUT_NORMAL)
            addTimeout(timeout)
          }
        }
      }

      // If user scrolled back to bottom, clear all manual scrolling flags more aggressively
      if (isBottom) {
        // Only clear manual scroll flags if user is actually at the bottom
        // This prevents auto-resuming when user is just near the bottom
        const isActuallyAtBottom = scrollHeight - scrollTop - clientHeight < 10 // Very strict bottom detection
        if (isActuallyAtBottom) {
          clearAllScrollFlags()
          // Notify parent that manual scrolling has stopped
          onManualScrollStateChange?.(false)
        }
      }

      // Additional immediate detection for streaming mode interruption
      if (isStreamingMode && scrollDirection === "up" && !isBottom) {
        // If user is scrolling up during streaming and not at bottom, mark as manual scrolling
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight
        if (
          distanceFromBottom > SCROLL_CONSTANTS.DISTANCE_FROM_BOTTOM_TOLERANCE
        ) {
          userScrollingManualRef.current = true
          // Notify parent of manual scroll state change
          onManualScrollStateChange?.(true)

          // If we're in streaming mode, clear the streaming timeout to give user full control
          if (isStreamingMode && streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current)
            streamingTimeoutRef.current = null
          }

          // During streaming, don't auto-clear the manual scroll flag
          // User must explicitly resume by scrolling to bottom or clicking button
          if (!isStreamingMode) {
            // Use a shorter timeout for immediate response during streaming
            const timeout = setTimeout(() => {
              userScrollingManualRef.current = false
              // Notify parent of manual scroll state change
              onManualScrollStateChange?.(false)
            }, SCROLL_CONSTANTS.MANUAL_SCROLL_CLEAR_TIMEOUT)
            addTimeout(timeout)
          }
        }
      }

      setIsScrolledToBottom(isBottom)
      setShowScrollToBottom(!isBottom)

      const isNearTop = scrollTop < SCROLL_CONSTANTS.SCROLL_TO_TOP_THRESHOLD

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
        onScroll(e.nativeEvent)
      }
    },
    [
      isScrolledToBottom,
      detectScrollToTop,
      onScroll,
      clearAllScrollFlags,
      addTimeout,
      onManualScrollStateChange,
      prevScrollTopRef,
      scrollHeightRef,
      setIsScrolledToBottom,
      setShowScrollToBottom,
      streamingTimeoutRef,
      userScrollingManualRef,
      // Refs are intentionally omitted to prevent infinite re-renders
    ]
  )

  useEffect(() => {
    // Check if there are any optimistic messages being generated
    const hasOptimisticMessages = messages.some(
      (msg) => msg.isOptimistic === true
    )

    // Only enter streaming mode if there are optimistic messages
    if (!hasOptimisticMessages) {
      // Clear any existing streaming timeout and RAF when no generation is happening
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current)
        streamingTimeoutRef.current = null
      }
      cancelRaf()
      return
    }

    // Detect if we're in streaming mode (content changing rapidly)
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current)
    }

    // Set streaming mode timeout - we're considered "streaming" for X seconds after content changes
    streamingTimeoutRef.current = setTimeout(() => {
      streamingTimeoutRef.current = null
      // stop any ongoing raf follow
      cancelRaf()
    }, SCROLL_CONSTANTS.STREAMING_MODE_TIMEOUT)

    // Auto-scroll logic
    const scrollContainer = scrollContainerRef.current

    // Check current real-time scroll position instead of relying on state
    const currentDistanceFromBottom = scrollContainer
      ? scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight
      : 999

    const isAtBottom =
      currentDistanceFromBottom < SCROLL_CONSTANTS.AT_BOTTOM_THRESHOLD
    const isNearBottom =
      currentDistanceFromBottom < SCROLL_CONSTANTS.NEAR_BOTTOM_THRESHOLD

    // During streaming mode, be much more aggressive about auto-scrolling
    const isStreamingMode = streamingTimeoutRef.current !== null

    // During streaming mode, ignore manual scroll flag completely and be very aggressive
    const shouldAutoScroll =
      scrollContainer &&
      (isStreamingMode
        ? (isAtBottom || isNearBottom) &&
          !userScrollingImageRef.current &&
          !userScrollingKeyboardRef.current &&
          !userScrollingManualRef.current
        : (isAtBottom || isNearBottom) &&
          !userScrollingImageRef.current &&
          !userScrollingKeyboardRef.current &&
          !userScrollingManualRef.current)

    if (shouldAutoScroll) {
      scrollToBottom("auto") // Use "auto" for smoother streaming
    }

    // Much more aggressive follow-up during streaming
    const followUpTimeout = setTimeout(() => {
      // During streaming, respect manual scroll flag to allow user interruption
      const stillShouldAutoScroll = isStreamingMode
        ? !userScrollingImageRef.current &&
          !userScrollingKeyboardRef.current &&
          !userScrollingManualRef.current
        : !userScrollingImageRef.current &&
          !userScrollingKeyboardRef.current &&
          !userScrollingManualRef.current

      if (stillShouldAutoScroll) {
        scrollToBottom("auto")

        // Extra persistence for streaming - multiple checks
        SCROLL_CONSTANTS.EXTRA_PERSISTENCE_DELAYS.forEach((delay) => {
          const persistenceTimeout = setTimeout(() => {
            const extraCheck = isStreamingMode
              ? !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current &&
                !userScrollingManualRef.current
              : !userScrollingImageRef.current &&
                !userScrollingKeyboardRef.current &&
                !userScrollingManualRef.current

            if (extraCheck) {
              scrollToBottom("auto")
            }
          }, delay)

          addTimeout(persistenceTimeout)
        })
      }
    }, SCROLL_CONSTANTS.SCROLL_FOLLOW_UP_DELAY)

    addTimeout(followUpTimeout)

    // Start a short-lived RAF follow loop while streaming for ultra-fast updates
    if (isStreamingMode && scrollContainer) {
      let startTime = performance.now()
      const maxDurationMs = Math.min(
        SCROLL_CONSTANTS.STREAMING_MODE_TIMEOUT,
        1500
      )

      const tick = (now: number) => {
        if (
          now - startTime > maxDurationMs ||
          streamingTimeoutRef.current === null
        ) {
          cancelRaf()
          return
        }

        const distance =
          scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight

        if (
          distance < SCROLL_CONSTANTS.NEAR_BOTTOM_THRESHOLD &&
          !userScrollingImageRef.current &&
          !userScrollingKeyboardRef.current &&
          !userScrollingManualRef.current
        ) {
          // keep pinned to bottom
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }

        rafIdRef.current = requestAnimationFrame(tick)
      }

      cancelRaf()
      rafIdRef.current = requestAnimationFrame(tick)
    }

    if (onScrollComplete) {
      onScrollComplete()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages, // Now we depend on messages to detect optimistic state changes
    isScrolledToBottom,
    initialScrollBehavior,
    onScrollComplete,
    scrollToBottom,
    addTimeout,
    cancelRaf,
    // Refs are intentionally omitted to prevent infinite re-renders
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRaf()
      clearAllTimeouts()
    }
  }, [clearAllTimeouts, cancelRaf])

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
          ref={scrollButtonRef}
          className={`follow-button ${
            streamingTimeoutRef.current && !userScrollingManualRef.current
              ? "streaming-interrupted"
              : ""
          }`}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            // Clear all manual scrolling flags when user explicitly scrolls to bottom
            clearAllScrollFlags()
            scrollToBottom()
          }}
          role="button"
          aria-label={
            streamingTimeoutRef.current && !userScrollingManualRef.current
              ? "Auto-scroll interrupted - Click to resume following new messages"
              : A11Y_CONSTANTS.SCROLL_TO_BOTTOM_LABEL
          }
          aria-describedby="scroll-to-bottom-description"
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
          <span id="scroll-to-bottom-description" className="sr-only">
            {streamingTimeoutRef.current && !userScrollingManualRef.current
              ? "Auto-scroll was interrupted while new messages were being generated. Click to resume automatically following new messages."
              : A11Y_CONSTANTS.SCROLL_TO_BOTTOM_DESCRIPTION}
          </span>
        </button>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChatFeed = forwardRef<any, ChatFeedProps>(({}, ref) => {
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
  const detectScrollToTopRef = useRef<ScrollDetectionFunction | null>(null)
  const forceScrollToBottomRef = useRef<ForceScrollFunction | null>(null)
  const previousMessageCountRef = useRef(0)
  const previousSyncCountRef = useRef(0)
  const messagesScrollViewRef = useRef<HTMLDivElement>(null)
  const manualScrollStateRef = useRef(false) // Track manual scroll state from child component

  const { addTimeout, clearAllTimeouts } = useTimeoutCleanup()

  useEffect(() => {
    if (messagesVisible && forceScrollToBottomRef.current) {
      // Only force scroll if there are optimistic messages being generated
      const hasOptimisticMessages = messages.some(
        (msg) => msg.isOptimistic === true
      )
      if (hasOptimisticMessages) {
        // Check if user has manually scrolled up before forcing scroll
        const scrollContainer = messagesScrollViewRef.current
        if (scrollContainer) {
          const currentDistanceFromBottom =
            scrollContainer.scrollHeight -
            scrollContainer.scrollTop -
            scrollContainer.clientHeight

          // Only auto-scroll if user is near bottom or hasn't manually scrolled up
          if (
            currentDistanceFromBottom <
              SCROLL_CONSTANTS.NEAR_BOTTOM_THRESHOLD ||
            !manualScrollStateRef.current
          ) {
            forceScrollToBottomRef.current()
          }
        }
      }
    }
  }, [messagesVisible, messages])

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
        const timeout = setTimeout(() => {
          if (forceScrollToBottomRef.current) {
            forceScrollToBottomRef.current()
          }
        }, SCROLL_CONSTANTS.NEW_MESSAGE_SCROLL_DELAY)
        addTimeout(timeout)
      }
    }

    // Update the previous message count
    previousMessageCountRef.current = currentMessageCount
  }, [messages, addTimeout])

  // Force scroll to bottom when sync indicators appear (if user is at bottom)
  // This handles the case where sync indicators appear 1 second after messages complete
  // and can cause message bubbles to grow slightly, pushing the user's view up if they're at the bottom
  useEffect(() => {
    const currentSyncCount = syncsInProgress.size
    const previousSyncCount = previousSyncCountRef.current

    // Check if a new sync started (sync count increased)
    if (
      currentSyncCount > previousSyncCount &&
      forceScrollToBottomRef.current
    ) {
      // Check if user is currently at or near bottom using ref instead of DOM query
      const scrollContainer = messagesScrollViewRef.current
      if (scrollContainer) {
        const currentDistanceFromBottom =
          scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight

        // If user is at bottom (within threshold), auto-scroll to accommodate sync indicator
        // Sync indicators appear 1 second after messages complete and can cause bubble growth
        // So we should auto-scroll if user is at bottom, regardless of optimistic messages
        if (
          currentDistanceFromBottom <
          SCROLL_CONSTANTS.DISTANCE_FROM_BOTTOM_TOLERANCE
        ) {
          const scrollAbsoluteBottom = () => {
            if (!messagesScrollViewRef.current) return
            const el = messagesScrollViewRef.current
            // Snap to absolute bottom immediately (ignore manual flags)
            el.scrollTop = el.scrollHeight
          }

          // Immediate rAF scroll to catch layout just before/after sync indicator mounts
          requestAnimationFrame(() => {
            scrollAbsoluteBottom()
          })

          // Primary delayed scroll to account for animation + bubble growth
          const timeout = setTimeout(() => {
            // Try direct snap first
            scrollAbsoluteBottom()
            // Also trigger the internal force scroll as a secondary nudge
            if (forceScrollToBottomRef.current) {
              forceScrollToBottomRef.current()
            }
          }, SCROLL_CONSTANTS.SYNC_SCROLL_DELAY)
          addTimeout(timeout)

          // Extra persistence: multiple follow-ups to ensure we stay pinned even if bubble keeps growing
          SCROLL_CONSTANTS.EXTRA_PERSISTENCE_DELAYS.forEach((delay) => {
            const persistenceTimeout = setTimeout(() => {
              scrollAbsoluteBottom()
            }, delay + SCROLL_CONSTANTS.SYNC_SCROLL_DELAY)
            addTimeout(persistenceTimeout)
          })
        }
      }
    }

    // Update the previous sync count
    previousSyncCountRef.current = currentSyncCount
  }, [syncsInProgress, messages, addTimeout])

  // Compute non-optimistic message IDs outside the effect
  const nonOptimisticMessageIDs = useMemo(() => {
    return messages
      .filter((msg) => !msg.isOptimistic && msg.response)
      .map((msg) => msg.id)
  }, [messages])

  useEffect(() => {
    if (!isLoading && nonOptimisticMessageIDs.length > 0) {
      checkStatuses(nonOptimisticMessageIDs)
    }
  }, [isLoading, nonOptimisticMessageIDs, checkStatuses]) // Now all dependencies are explicit

  useEffect(() => {
    let isMounted = true

    if (!isLoading && messages.length > 0) {
      requestAnimationFrame(() => {
        if (!isMounted) return

        if (isMobile && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
          const timeout = setTimeout(() => {
            if (isMounted) {
              setMessagesVisible(true)
              initialRenderRef.current = false
            }
          }, SCROLL_CONSTANTS.MOBILE_RENDER_DELAY)
          addTimeout(timeout)
        } else {
          setMessagesVisible(true)
          initialRenderRef.current = false
        }
      })
    }

    return () => {
      isMounted = false
    }
  }, [isLoading, messages, isMobile, addTimeout])

  const handleScrollToTop = useCallback(() => {
    if (
      hasNextPage &&
      !isLoading &&
      !isFetchingNextPage &&
      !fetchingRef.current
    ) {
      fetchingRef.current = true
      setShouldFetchNext(true)
    }
  }, [hasNextPage, isLoading, isFetchingNextPage])

  useEffect(() => {
    const fetchOlderMessages = async () => {
      if (!shouldFetchNext) return

      try {
        // Get initial scroll position using ref instead of DOM query
        const scrollContainer = messagesScrollViewRef.current
        let prevHeight = 0

        if (scrollContainer) {
          prevHeight = scrollContainer.scrollHeight
        }

        await fetchNextPage()

        // Set a reasonable timeout to ensure DOM is updated
        const timeout = setTimeout(() => {
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
        }, SCROLL_CONSTANTS.FETCH_SCROLL_POSITION_DELAY)
        addTimeout(timeout)
      } catch (error) {
        console.error("Error loading more messages:", error)
        fetchingRef.current = false
        setShouldFetchNext(false)
      }
    }

    if (shouldFetchNext) {
      fetchOlderMessages()
    }
  }, [shouldFetchNext, fetchNextPage, addTimeout])

  const handleCopy = useCallback(
    (message: any, type: "prompt" | "response" = "prompt") => {
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
    },
    []
  )

  const handleMessageDelete = useCallback(
    async (message: any) => {
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
    },
    [confirmMemoryDeletion, refetch]
  )

  const handleShowMemories = useCallback(
    async (message: any) => {
      try {
        await showMemoryNetwork(message)
      } catch (error) {
        console.error("Error showing memory network:", error)
        toast.error("Failed to show memory network")
      }
    },
    [showMemoryNetwork]
  )

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts()
    }
  }, [clearAllTimeouts])

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
          scrollContainerRefExternal={messagesScrollViewRef}
          messages={messages}
          onManualScrollStateChange={(isManualScrolling) => {
            manualScrollStateRef.current = isManualScrolling
          }}
          style={{
            opacity: messagesVisible ? 1 : 0,
            transition: UI_CONSTANTS.OPACITY_TRANSITION,
          }}
        >
          {messages
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((message: any, index: number) => {
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
