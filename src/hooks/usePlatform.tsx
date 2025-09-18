import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react"

// Platform information interface - only includes actually used properties
interface PlatformInfo {
  isMobile: boolean
  isIOS: boolean
  isPWA: boolean
  safeAreaBottom: number
}

// Internal platform detection functions
function isPWAMode(): boolean {
  return (
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone)) ??
    false
  )
}

function getSafeAreaBottom(): number {
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

function getPlatformInfo(): PlatformInfo {
  const userAgent = navigator.userAgent
  const hasTouchScreen = navigator.maxTouchPoints > 0

  // Mobile detection - simplified and optimized
  const isMobileUserAgent =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    )
  const isMobile = hasTouchScreen && isMobileUserAgent

  // iOS detection - optimized
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

  // PWA detection
  const isPWA = isPWAMode()

  // Safe area bottom detection - only for iOS
  const safeAreaBottom = isIOS ? getSafeAreaBottom() : 0

  return {
    isMobile,
    isIOS,
    isPWA,
    safeAreaBottom,
  }
}

// Main hook with reactive updates
export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() =>
    getPlatformInfo()
  )

  useEffect(() => {
    const updatePlatformInfo = () => {
      setPlatformInfo(getPlatformInfo())
    }

    // Listen for PWA mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)")
    mediaQuery.addEventListener("change", updatePlatformInfo)

    // Listen for orientation changes that might affect safe areas
    window.addEventListener("orientationchange", updatePlatformInfo)
    window.addEventListener("resize", updatePlatformInfo)

    // Initial update
    updatePlatformInfo()

    return () => {
      mediaQuery.removeEventListener("change", updatePlatformInfo)
      window.removeEventListener("orientationchange", updatePlatformInfo)
      window.removeEventListener("resize", updatePlatformInfo)
    }
  }, [])

  return platformInfo
}

// Context provider for platform information
const PlatformContext = createContext<PlatformInfo | null>(null)

export function PlatformProvider({ children }: { children: ReactNode }) {
  const platformInfo = usePlatform()

  return (
    <PlatformContext.Provider value={platformInfo}>
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatformContext(): PlatformInfo {
  const context = useContext(PlatformContext)

  if (!context) {
    throw new Error("usePlatformContext must be used within a PlatformProvider")
  }

  return context
}
