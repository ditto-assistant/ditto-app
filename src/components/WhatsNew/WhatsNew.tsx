import { useState, useEffect } from "react"
import Modal from "@/components/ui/modals/Modal"
import { version as appVersion } from "../../../package.json"
import "./WhatsNew.css"

// Helper to convert version string to component path format
export const getVersionComponentKey = (version: string): string => {
  return version.replace(/\./g, "_")
}

// Helper to convert component name to version string
export const getVersionFromComponentKey = (key: string): string => {
  return key.replace(/_/g, ".")
}

interface WhatsNewProps {
  version?: string
}

const WhatsNew = ({ version = appVersion }: WhatsNewProps) => {
  const [VersionComponent, setVersionComponent] =
    useState<React.ComponentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Reset state when version changes
    setLoading(true)
    setError(false)
    setVersionComponent(null)

    // Format version for dynamic import
    const formattedVersion = getVersionComponentKey(version)

    // Dynamically import the version component
    import(`./versions/V${formattedVersion}.tsx`)
      .then((module) => {
        setVersionComponent(() => module.default)
        setLoading(false)
      })
      .catch((err) => {
        console.error(`Failed to load version component for ${version}:`, err)
        setError(true)
        setLoading(false)
      })
  }, [version])

  // Loading state
  if (loading) {
    return (
      <Modal id="whatsNew" title={`What's New in v${version}`}>
        <div className="whats-new-content">
          <div className="whats-new-loading">Loading...</div>
        </div>
      </Modal>
    )
  }

  // If no component exists for this version or there was an error, show a generic message
  const content = VersionComponent ? (
    <VersionComponent />
  ) : (
    <div className="whats-new-generic">
      <p>Welcome to Ditto version {version}!</p>
      <p>Check back later for detailed release notes.</p>
      {error && (
        <p className="text-muted">
          Note: Could not load detailed release notes for this version.
        </p>
      )}
    </div>
  )

  return (
    <Modal id="whatsNew" title={`What's New in v${version}`}>
      <div className="whats-new-content">{content}</div>
    </Modal>
  )
}

export default WhatsNew
