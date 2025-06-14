import { useState, useEffect } from "react"
import { IOSInfo, getIOSInfo } from "@/utils/iosDetection"

/**
 * React hook for iOS device and PWA detection with reactive updates
 */
export function useIOSDetection(): IOSInfo {
  const [iosInfo, setIosInfo] = useState<IOSInfo>(() => getIOSInfo())

  useEffect(() => {
    // Update iOS info on mount and when display mode changes
    const updateIOSInfo = () => {
      setIosInfo(getIOSInfo())
    }

    // Listen for PWA mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)")
    mediaQuery.addEventListener("change", updateIOSInfo)

    // Listen for orientation changes that might affect safe areas
    window.addEventListener("orientationchange", updateIOSInfo)
    window.addEventListener("resize", updateIOSInfo)

    // Initial update
    updateIOSInfo()

    return () => {
      mediaQuery.removeEventListener("change", updateIOSInfo)
      window.removeEventListener("orientationchange", updateIOSInfo)
      window.removeEventListener("resize", updateIOSInfo)
    }
  }, [])

  return iosInfo
}
