import { useState, useEffect } from "react";

export function useIsIOS() {
  const [isIOS, setIsIOS] = useState<boolean>(() => {
    // Initial check
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  });

  useEffect(() => {
    // Re-check on mount in case of SSR
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
  }, []);

  return isIOS;
}
