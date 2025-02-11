import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // Initial check
    const hasTouchScreen = navigator.maxTouchPoints > 0;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      );
    return hasTouchScreen && isMobileUserAgent;
  });

  useEffect(() => {
    // Re-check on mount in case of SSR
    const hasTouchScreen = navigator.maxTouchPoints > 0;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      );
    setIsMobile(hasTouchScreen && isMobileUserAgent);
  }, []);

  return isMobile;
}
