import { createContext, useContext, ReactNode } from "react";

type Platform =
  | "ios"
  | "ipad"
  | "mac"
  | "android"
  | "windows"
  | "linux"
  | "unknown";

export function usePlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIPadOS =
    navigator.maxTouchPoints > 0 &&
    /mac/.test(userAgent) &&
    "ontouchend" in document;
  const isIPhone = /iphone|ipod/.test(userAgent);
  const isIPad = /ipad/.test(userAgent) || isIPadOS;
  const isMac = /mac/.test(userAgent) && !isIPadOS;
  const isAndroid = /android/.test(userAgent);
  const isWindows = /win/.test(userAgent);
  const isLinux = /linux/.test(userAgent) && !/android/.test(userAgent);
  const hasTouchScreen = navigator.maxTouchPoints > 0;
  const isMobileUserAgent =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );
  const isMobile = hasTouchScreen && isMobileUserAgent;
  const isPWA = window.matchMedia("(display-mode: standalone)").matches;

  let platform: Platform;
  if (isIPhone) {
    platform = "ios";
  } else if (isIPad) {
    platform = "ipad";
  } else if (isMac) {
    platform = "mac";
  } else if (isAndroid) {
    platform = "android";
  } else if (isWindows) {
    platform = "windows";
  } else if (isLinux) {
    platform = "linux";
  } else {
    platform = "unknown";
  }
  const isIOS = platform === "ios" || platform === "ipad";

  return {
    platform,
    isIPhone,
    isIPad,
    isMac,
    isAndroid,
    isWindows,
    isLinux,
    isMobile,
    isIOS,
    isPWA,
  };
}

type PlatformContextType = {
  platform: Platform;
  isIPhone: boolean;
  isIPad: boolean;
  isMac: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isPWA: boolean;
};

const PlatformContext = createContext<PlatformContextType | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const platformInfo = usePlatform();

  return (
    <PlatformContext.Provider value={platformInfo}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatformContext() {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error(
      "usePlatformContext must be used within a PlatformProvider",
    );
  }

  return context;
}
