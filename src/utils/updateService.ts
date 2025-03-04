import { registerSW } from "virtual:pwa-register";
import { version as appVersion } from "../../package.json";

// Compare versions using semver logic
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
};

// Import types from common.ts
import type { UpdateServiceState } from "@/types/common";

export type UpdateStatus =
  | "idle"
  | "update-available"
  | "update-ready"
  | "update-error"
  | "outdated";

// Event names
export const UPDATE_AVAILABLE = "update-available";
export const UPDATE_READY = "update-ready";
export const UPDATE_ERROR = "update-error";

// Create a custom event for updates
function createUpdateEvent<T>(type: string, detail: T): CustomEvent<T> {
  return new CustomEvent(type, { detail }) as CustomEvent<T>;
}

// Initialize service state
const initialState: UpdateServiceState = {
  status: "idle",
  currentVersion: appVersion,
  needsRefresh: false,
  justUpdated: false,
};

let state = { ...initialState };

// Register service worker and set up update handling
export const initUpdateService = () => {
  try {
    // Load last version from localStorage to detect updates
    const storedVersion = localStorage.getItem("app-version");

    if (storedVersion && compareVersions(appVersion, storedVersion) > 0) {
      // User just updated
      state.justUpdated = true;
      state.lastCheckedVersion = storedVersion;

      // Force clear webpack/vite chunk cache to reload all lazy components
      try {
        // Clear all cached resources from the browser cache using the Cache API
        if ("caches" in window) {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              // Target Vite/Workbox caches specifically
              if (cacheName.includes("vite") || cacheName.includes("workbox")) {
                console.log(`Clearing cache: ${cacheName}`);
                caches.delete(cacheName);
              }
            });
          });
        }

        // If we detect we just updated, set a flag to force reload lazy components
        // when they're accessed next
        localStorage.setItem("force-reload-lazy", "true");

        console.log("Update detected: Lazy components will be refreshed");
      } catch (err) {
        console.error("Failed to clear cache:", err);
      }
    }

    // Save current version
    localStorage.setItem("app-version", appVersion);

    // Register service worker with update detection
    const updateSW = registerSW({
      onNeedRefresh() {
        state.status = "update-ready";
        state.needsRefresh = true;
        window.dispatchEvent(createUpdateEvent(UPDATE_READY, state));
      },
      onOfflineReady() {
        console.log("App ready to work offline");
      },
      onRegistered(registration: ServiceWorkerRegistration | undefined) {
        // Check for updates periodically
        if (registration) {
          setInterval(
            () => {
              registration.update().catch(console.error);
            },
            60 * 60 * 1000,
          ); // Check every hour
        }
      },
      onRegisterError(error: Error) {
        console.error("Service worker registration error:", error);
        state.status = "update-error";
        window.dispatchEvent(createUpdateEvent(UPDATE_ERROR, { error }));
      },
    });

    // Make the update function globally available
    window.__updateSW = () => {
      // First set the reload flag to force refreshing lazy components
      localStorage.setItem("force-reload-lazy", "true");
      // Then activate the service worker
      updateSW(true);
      // Force a complete reload that bypasses the cache
      setTimeout(() => {
        console.log("Forcing complete page reload");
        window.location.reload();
      }, 300); // Small delay to ensure service worker activation
    };

    return updateSW;
  } catch (error) {
    console.error("Failed to initialize update service:", error);
    return null;
  }
};

// Handle lazy loading errors by checking if they are related to outdated app version
export const handleLazyLoadError = (error: Error | unknown): boolean => {
  // Cast error to a type with potential message property
  const err = error as { message?: string; name?: string };

  // Common error patterns when chunks fail to load due to version mismatch
  const isChunkError =
    (err?.message &&
      (err.message.includes("Loading chunk") ||
        err.message.includes("Failed to fetch dynamically imported module") ||
        err.message.includes("Unexpected token"))) ||
    err?.name === "ChunkLoadError";

  if (isChunkError) {
    state.status = "outdated";
    state.needsRefresh = true;
    window.dispatchEvent(
      createUpdateEvent(UPDATE_ERROR, {
        error,
        outdated: true,
        message: "App is outdated and needs to be updated",
      }),
    );
    return true;
  }

  return false;
};

// Get current state
export const getUpdateState = (): UpdateServiceState => {
  return { ...state };
};

// Apply available update
export const applyUpdate = () => {
  // Always set the force reload flag before updating
  localStorage.setItem("force-reload-lazy", "true");

  if (typeof window.__updateSW === "function") {
    window.__updateSW();
  } else {
    // Force a hard reload to clear browser cache
    window.location.reload();
  }
};

// Declare global interface
declare global {
  interface Window {
    __updateSW?: (reloadPage?: boolean) => void;
  }
}
