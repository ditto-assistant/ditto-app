import { useState, useEffect } from "react";

export function useIsIOS() {
  const [isIOS, setIsIOS] = useState<boolean>(() => {
    // Initial check - improved detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS =
      /iphone|ipad|ipod|mac/.test(userAgent) && "ontouchend" in document;
    return isIOS;
  });

  useEffect(() => {
    // Re-check on mount in case of SSR
    const userAgent = navigator.userAgent.toLowerCase();
    const isIPadOS =
      navigator.maxTouchPoints > 0 &&
      /mac/.test(userAgent) &&
      "ontouchend" in document;
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

    // Set to true if either detected
    setIsIOS(isIOSDevice || isIPadOS);

    // Add iOS class to html element for CSS targeting
    if (isIOSDevice || isIPadOS) {
      document.documentElement.classList.add("ios");
    }

    return () => {
      document.documentElement.classList.remove("ios");
    };
  }, []);

  return isIOS;
}
