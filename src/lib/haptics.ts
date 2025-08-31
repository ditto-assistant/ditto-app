/**
 * Haptic feedback intensity presets
 */
export enum HapticPattern {
  Light = 10,
  Medium = 15,
  Heavy = 20,
  Success = 25,
  Error = 30,
  Warning = 35,
}

/**
 * Complex vibration patterns for special interactions
 */
export const VibrationPatterns = {
  Success: [10, 20], // Short double-pulse for success
  Error: [20, 30, 40], // Escalating triple-pulse for errors
  Warning: [15, 50, 15], // Warning pattern
  Complete: [10, 20, 10, 20], // Task completion pattern
  Notification: [5, 30, 10], // Notification arrival
}

/**
 * Standalone function to trigger haptic feedback without using the hook
 * Useful for event handlers where hooks can't be used directly
 *
 * @param pattern - Vibration pattern or duration in ms
 * @return void
 */
export function triggerHaptic(pattern: HapticPattern | number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}
