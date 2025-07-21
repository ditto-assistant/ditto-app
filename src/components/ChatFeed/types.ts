import { ReactNode, MutableRefObject } from "react"

// Scroll behavior type - consolidated from multiple boolean flags
export type ScrollBehavior = "smooth" | "auto"

export type ScrollState = "idle" | "userScrolling" | "streaming"

// Refs for scroll detection and control
export interface ScrollRefs {
  scrollContainer: MutableRefObject<HTMLDivElement | null>
  userScrollingImage: MutableRefObject<boolean>
  userScrollingKeyboard: MutableRefObject<boolean>
  userScrollingManual: MutableRefObject<boolean>
  streamingTimeout: MutableRefObject<NodeJS.Timeout | null>
  isInitialScroll: MutableRefObject<boolean>
  prevScrollTop: MutableRefObject<number>
  scrollHeight: MutableRefObject<number>
  previousMessageCount: MutableRefObject<number>
  previousSyncCount: MutableRefObject<number>
}

// Force scroll function type
export type ForceScrollFunction = () => void

// Scroll detection function type
export type ScrollDetectionFunction = () => void

// CustomScrollToBottom component props
export interface CustomScrollToBottomProps {
  children: ReactNode
  onScroll?: (e: Event) => void
  onScrollComplete?: () => void
  className?: string
  style?: React.CSSProperties
  scrollViewClassName?: string
  initialScrollBehavior?: ScrollBehavior
  detectScrollToTop?: ScrollDetectionFunction
  onScrollToTopRef?: MutableRefObject<ScrollDetectionFunction | null>
  forceScrollToBottomRef?: MutableRefObject<ForceScrollFunction | null>
}

// Main ChatFeed component props (forwardRef pattern)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ChatFeedProps {}

// Message menu actions interface
export interface MessageMenuProps {
  id: string
  onCopy: () => void
  onDelete: () => void
  onShowMemories: () => void
}

// Hook return types for better type safety
export interface ConversationHookResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[] // Using any for now as the full Message type is complex
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchNextPage: () => Promise<any>
  refetch: () => void
}

// Reduced motion preference detection
export interface MotionPreferences {
  prefersReducedMotion: boolean
}
