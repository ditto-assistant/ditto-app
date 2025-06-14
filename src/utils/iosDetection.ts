/**
 * iOS device and PWA detection utilities for proper safe area handling
 */

export interface IOSInfo {
  isIOS: boolean
  isPWA: boolean
  hasNotch: boolean
  hasHomeIndicator: boolean
  safeAreaBottom: number
  deviceType: "iphone" | "ipad" | "other"
}

/**
 * Detects if the current device is iOS
 */
export function isIOSDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

/**
 * Detects if the app is running as a PWA (installed to home screen)
 */
export function isPWAMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone)
  )
}

/**
 * Detects if the device has a home indicator (newer iPhones/iPads)
 */
export function hasHomeIndicator(): boolean {
  if (!isIOSDevice()) return false

  // Check if safe-area-inset-bottom is available and greater than 0
  const testEl = document.createElement("div")
  testEl.style.position = "fixed"
  testEl.style.bottom = "0"
  testEl.style.paddingBottom = "env(safe-area-inset-bottom)"
  document.body.appendChild(testEl)

  const computedStyle = window.getComputedStyle(testEl)
  const paddingBottom = parseInt(computedStyle.paddingBottom) || 0

  document.body.removeChild(testEl)

  return paddingBottom > 0
}

/**
 * Gets the safe area bottom inset value in pixels
 */
export function getSafeAreaBottom(): number {
  if (!isIOSDevice()) return 0

  const testEl = document.createElement("div")
  testEl.style.position = "fixed"
  testEl.style.bottom = "0"
  testEl.style.paddingBottom = "env(safe-area-inset-bottom)"
  document.body.appendChild(testEl)

  const computedStyle = window.getComputedStyle(testEl)
  const paddingBottom = parseInt(computedStyle.paddingBottom) || 0

  document.body.removeChild(testEl)

  return paddingBottom
}

/**
 * Determines the device type based on screen dimensions and user agent
 */
export function getIOSDeviceType(): "iphone" | "ipad" | "other" {
  if (!isIOSDevice()) return "other"

  const { width, height } = window.screen
  const maxDimension = Math.max(width, height)
  const minDimension = Math.min(width, height)

  // iPad detection (larger screens)
  if (minDimension >= 768 || /iPad/.test(navigator.userAgent)) {
    return "ipad"
  }

  // iPhone detection
  if (/iPhone/.test(navigator.userAgent) || maxDimension <= 932) {
    return "iphone"
  }

  return "other"
}

/**
 * Detects if the device has a notch (newer iPhones)
 */
export function hasNotch(): boolean {
  if (!isIOSDevice()) return false

  // Check if safe-area-inset-top is available and greater than 0
  const testEl = document.createElement("div")
  testEl.style.position = "fixed"
  testEl.style.top = "0"
  testEl.style.paddingTop = "env(safe-area-inset-top)"
  document.body.appendChild(testEl)

  const computedStyle = window.getComputedStyle(testEl)
  const paddingTop = parseInt(computedStyle.paddingTop) || 0

  document.body.removeChild(testEl)

  return paddingTop > 0
}

/**
 * Comprehensive iOS information gathering
 */
export function getIOSInfo(): IOSInfo {
  const isIOS = isIOSDevice()
  const isPWA = isPWAMode()
  const hasHomeIndicatorValue = hasHomeIndicator()
  const hasNotchValue = hasNotch()
  const safeAreaBottom = getSafeAreaBottom()
  const deviceType = getIOSDeviceType()

  return {
    isIOS,
    isPWA,
    hasNotch: hasNotchValue,
    hasHomeIndicator: hasHomeIndicatorValue,
    safeAreaBottom,
    deviceType,
  }
}

/**
 * Hook-like function to get iOS info with reactive updates
 */
export function useIOSInfo(): IOSInfo {
  return getIOSInfo()
}
