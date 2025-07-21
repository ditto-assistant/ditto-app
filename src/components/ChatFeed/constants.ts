// ChatFeed constants - extracted magic numbers for maintainability

// Scroll behavior constants
export const SCROLL_CONSTANTS = {
  // Distance thresholds
  DISTANCE_FROM_BOTTOM_TOLERANCE: 100, // px - tolerance for "at bottom" detection
  NEAR_BOTTOM_THRESHOLD: 150, // px - threshold for "near bottom" during streaming
  AT_BOTTOM_THRESHOLD: 30, // px - strict "at bottom" threshold
  VERY_FAR_FROM_BOTTOM: 200, // px - threshold for very far from bottom
  SCROLL_TO_TOP_THRESHOLD: 50, // px - threshold for scroll to top detection
  
  // Scroll amount thresholds
  SIGNIFICANT_SCROLL_UP: 20, // px - threshold for detecting manual scroll up
  VERY_SIGNIFICANT_SCROLL_UP: 100, // px - stricter threshold during streaming
  
  // Timing constants
  IMMEDIATE_SCROLL_DELAY: 10, // ms - delay for immediate scroll during streaming
  STANDARD_SCROLL_DELAY: 50, // ms - standard scroll delay
  USER_SCROLL_TIMEOUT: 500, // ms - timeout for user scroll detection
  MANUAL_SCROLL_CLEAR_TIMEOUT: 300, // ms - timeout to clear manual scroll flag during streaming
  MANUAL_SCROLL_CLEAR_TIMEOUT_NORMAL: 1000, // ms - timeout to clear manual scroll flag in normal mode
  STREAMING_MODE_TIMEOUT: 5000, // ms - how long to consider content "streaming"
  
  // Follow-up scroll delays
  SCROLL_FOLLOW_UP_DELAY: 60, // ms - delay for follow-up scroll checks
  EXTRA_PERSISTENCE_DELAYS: [50, 150, 300, 500, 800], // ms - multiple delays for streaming persistence
  
  // Initial render delays
  INITIAL_SCROLL_DELAY: 100, // ms - delay for initial scroll to bottom
  MOBILE_RENDER_DELAY: 200, // ms - additional delay for mobile iOS rendering
  FETCH_SCROLL_POSITION_DELAY: 150, // ms - delay after fetching to restore scroll position
  
  // Keyboard handling
  MIN_KEYBOARD_HEIGHT: 200, // px - minimum height to consider keyboard visible
  KEYBOARD_HEIGHT_CHANGE_THRESHOLD: 50, // px - minimum change to trigger keyboard handling
  KEYBOARD_SCROLL_DELAY: 100, // ms - delay for scroll when keyboard appears
  
  // Sync indicator scroll
  SYNC_SCROLL_DELAY: 100, // ms - delay when sync indicator appears
  
  // Force scroll delays for new messages  
  NEW_MESSAGE_SCROLL_DELAY: 200, // ms - delay for new message scroll persistence
} as const

// UI constants
export const UI_CONSTANTS = {
  // Button positioning
  KEYBOARD_BUTTON_OFFSET: 20, // px - offset for scroll button when keyboard is visible
  
  // Transitions
  BUTTON_TRANSITION_UP: "bottom 0.2s ease-out",
  BUTTON_TRANSITION_DOWN: "bottom 0.3s ease-out", 
  OPACITY_TRANSITION: "opacity 0.2s ease-in-out",
} as const

// Accessibility constants
export const A11Y_CONSTANTS = {
  SCROLL_TO_BOTTOM_LABEL: "Scroll to bottom of conversation",
  SCROLL_TO_BOTTOM_DESCRIPTION: "Scrolls the conversation view to the most recent message",
} as const