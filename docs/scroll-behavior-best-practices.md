# Scroll Behavior Best Practices

## Overview

This document captures key learnings and best practices for implementing scroll behavior in the Ditto chat app, particularly for infinite scrolling and loading older messages.

## Key Challenges

1. **Native vs. Component Scrolling**: Custom scrolling components (like shadcn's ScrollArea) might interfere with native browser scrolling capabilities, especially for complex operations like infinite scrolling.

2. **Scroll Position Maintenance**: When loading content dynamically at the top (older messages), maintaining the user's visual position is critical for a good user experience.

3. **Mobile Platform Considerations**: Keyboard appearance and viewport changes complicate scroll behavior on mobile devices.

4. **Performance**: Inefficient scroll handlers can cause performance issues.

## Best Practices

### 1. Use Native Scrolling for Complex Scenarios

While UI component libraries like shadcn provide elegant scroll components (like `ScrollArea`), for complex behaviors like infinite scrolling, native browser scrolling is often more reliable:

```jsx
// Prefer this for complex scrolling like infinite scroll
<div
  ref={scrollContainerRef}
  className="custom-scroll-view"
  onScroll={handleScroll}
  style={{
    overflowY: "auto",
    height: "100%",
  }}
>
  {children}
</div>

// Instead of component libraries for complex scroll patterns
<ScrollArea
  className="h-full w-full"
  onScroll={handleScroll}
>
  {children}
</ScrollArea>
```

### 2. Maintaining Scroll Position When Loading Content

When loading older messages at the top, calculate and maintain the relative position:

```javascript
// Get position before loading
let prevHeight = scrollContainer.scrollHeight
let prevScrollTop = scrollContainer.scrollTop

// After loading new content
setTimeout(() => {
  const newHeight = scrollContainer.scrollHeight
  const heightDifference = newHeight - prevHeight

  // Position the scroll to maintain the same view
  if (heightDifference > 0) {
    // This keeps the content the user was looking at in the same position
    scrollContainer.scrollTop = prevScrollTop + heightDifference
  }
}, 150) // Allow time for DOM to update
```

### 3. Debouncing Scroll Events

Always debounce scroll handlers to prevent performance issues:

```javascript
let scrollTimer = null
const handleUserScrolling = () => {
  userScrollingRef.current = true
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    userScrollingRef.current = false
  }, 200)
}
```

### 4. Proper Cleanup of Event Listeners

```javascript
useEffect(() => {
  const scrollContainer = scrollContainerRef.current
  scrollContainer.addEventListener("scroll", handleScroll)

  return () => {
    scrollContainer.removeEventListener("scroll", handleScroll)
  }
}, [])
```

### 5. Adaptive Bottom Spacing for Mobile

Account for safe areas and keyboard appearance:

```jsx
<div
  ref={bottomRef}
  className="bottom-spacer"
  style={{
    height: "env(safe-area-inset-bottom, 120px)",
    minHeight: "120px",
    padding: "24px",
  }}
/>
```

### 6. Handling Keyboard Visibility on Mobile

Detect keyboard visibility changes and adjust UI accordingly:

```javascript
const handleResize = () => {
  const currentHeight = window.innerHeight
  const heightDiff = initialHeight - currentHeight

  if (heightDiff > MIN_KEYBOARD_HEIGHT && !isKeyboardVisible) {
    // Keyboard is now visible
    isKeyboardVisible = true
    // Adjust scroll-to-bottom button position
    scrollToBottomButton.style.bottom = `${heightDiff + 20}px`
  } else if (heightDiff <= MIN_KEYBOARD_HEIGHT && isKeyboardVisible) {
    // Keyboard is now hidden
    isKeyboardVisible = false
    scrollToBottomButton.style.bottom = ""
  }
}
```

### 7. Initial Scrolling Behavior

For initial scrolling to bottom without animation:

```javascript
if (isInitialScrollRef.current) {
  scrollContainer.scrollTo({
    top: scrollContainer.scrollHeight,
    behavior: "auto", // Use 'auto' instead of 'smooth' to avoid animation
  })
  isInitialScrollRef.current = false
}
```

## Common Pitfalls

1. **Fixed Position Approach**: Setting scroll position to a fixed value (e.g., 200px from top) can disorient users when loading older content.

2. **Global Variables**: Relying on global window variables for scroll references can lead to unexpected behavior and memory leaks.

3. **Complex DOM Traversal**: Attempting to find scroll containers through complex DOM traversal instead of direct refs can be fragile.

4. **Missing Cleanup**: Failing to clean up event listeners, especially in components that mount/unmount frequently.

5. **Over-Engineering**: Adding complex scroll libraries when native browser scrolling would suffice.

## Testing Scroll Behavior

When implementing or modifying scroll behavior, test the following scenarios:

1. Initial load with empty chat and with existing messages
2. Loading older messages at the top
3. Scrolling while images are loading
4. Mobile keyboard appearance/disappearance
5. Message deletion and addition
6. Rapid scrolling up and down
7. Screen rotation on mobile devices
8. Behavior with very long messages or code blocks

## Platform-Specific Considerations

### iOS

- Use `-webkit-overflow-scrolling: touch` for smooth inertial scrolling
- Account for notch and home indicator with safe-area-inset variables

### Android

- Test on various Android versions as scroll behavior can vary
- Use hardware acceleration (`transform: translateZ(0)`) for smooth scrolling

## Conclusion

Implementing reliable, cross-platform scroll behavior is challenging but critical for a good user experience in chat applications. Prefer simplicity and native browser capabilities over complex libraries when possible, and always maintain the user's context when loading new content.
