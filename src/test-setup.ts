// Mock virtual:pwa-register for tests
import { mock } from "bun:test"

// Mock the virtual PWA register module
mock.module("virtual:pwa-register", () => ({
  registerSW: mock(() => ({
    onNeedRefresh: mock(),
    onOfflineReady: mock(),
    onRegistered: mock(),
    onRegisterError: mock(),
  })),
}))

// Mock browser globals for Node.js test environment
if (typeof window === "undefined") {
  // Mock localStorage
  const localStorageMock = {
    getItem: mock(() => null),
    setItem: mock(() => {}),
    removeItem: mock(() => {}),
    clear: mock(() => {}),
    length: 0,
    key: mock(() => null),
  }

  // Mock window object
  globalThis.window = {
    localStorage: localStorageMock,
    __updateSW: mock(),
    location: {
      reload: mock(),
    },
    dispatchEvent: mock(),
    CustomEvent: mock(),
    addEventListener: mock(),
    removeEventListener: mock(),
  } as unknown as Window & typeof globalThis

  // Mock document
  globalThis.document = {
    defaultView: globalThis.window,
    addEventListener: mock(),
    removeEventListener: mock(),
    getElementsByTagName: mock(() => []),
    head: {
      appendChild: mock(),
      removeChild: mock(),
    },
    createElement: mock(() => ({
      setAttribute: mock(),
      appendChild: mock(),
      textContent: "",
      styleSheet: null,
      style: {},
    })),
    createTextNode: mock(() => ({})),
  } as unknown as Document & typeof globalThis

  // Mock localStorage globally
  globalThis.localStorage = localStorageMock
}

// Mock other problematic modules if needed
// Add any other global test setup here
