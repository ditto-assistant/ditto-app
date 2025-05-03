import { HapticPattern, VibrationPatterns, triggerHaptic } from "./haptics"

/**
 * Adds haptic feedback to form events
 * Utility functions to add haptic feedback to common form interactions
 */

/**
 * Haptic feedback for form submission
 * @param success Whether the submission was successful
 */
export function formSubmitHaptic(success: boolean = true) {
  if (success) {
    triggerHaptic(VibrationPatterns.Success)
  } else {
    triggerHaptic(VibrationPatterns.Error)
  }
}

/**
 * Haptic feedback for form validation
 * @param isValid Whether the form is valid
 */
export function formValidationHaptic(isValid: boolean) {
  if (isValid) {
    triggerHaptic(HapticPattern.Light)
  } else {
    triggerHaptic(HapticPattern.Warning)
  }
}

/**
 * Haptic feedback for field-level validation
 * @param isValid Whether the field is valid
 * @param isDirty Whether the field has been touched/changed
 */
export function fieldValidationHaptic(
  isValid: boolean,
  isDirty: boolean = true
) {
  if (!isDirty) return

  if (isValid) {
    triggerHaptic(HapticPattern.Light)
  } else {
    triggerHaptic(HapticPattern.Medium)
  }
}

/**
 * Higher-order function that adds haptic feedback to any form handler
 * @param callback The original form handler function
 * @param pattern The haptic pattern to use
 * @returns A wrapped function that triggers haptic feedback before calling the original
 */
export function withHapticFeedback<T extends (...args: any[]) => any>(
  callback: T,
  pattern: HapticPattern | number | number[] = HapticPattern.Light
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    triggerHaptic(pattern)
    return callback(...args)
  }
}
