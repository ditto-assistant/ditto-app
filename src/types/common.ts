export type Result<T> = {
  ok?: T
  err?: string
}

export type FetchHook<T> = Result<T> & {
  loading: boolean
  refetch: () => void
}

// Add UpdateServiceState to common types
export interface UpdateServiceState {
  status:
    | "idle"
    | "update-available"
    | "update-ready"
    | "update-error"
    | "outdated"
  updateVersion?: string
  currentVersion: string
  lastCheckedVersion?: string
  needsRefresh: boolean
  justUpdated: boolean
}

// Add WhatsNew related types
export interface WhatsNewFeature {
  type: "new" | "improved" | "fixed"
  title: string
  description: string
}

export interface WhatsNewSection {
  title: string
  features: WhatsNewFeature[]
}

// Add window interfaces
declare global {
  interface Window {
    __updateSW?: (reloadPage?: boolean) => void
    lazyLoadErrorHandler?: (error: Error) => boolean
  }
}
