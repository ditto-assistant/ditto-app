import { ModelPreferences } from "@/types/llm"
import ModelDropdown from "./ModelDropdown"
import ModelDropdownImage from "./ModelDropdownImage"
import { useState, useEffect } from "react"

interface ModelPreferencesSelectorsProps {
  preferences: ModelPreferences
  updatePreferences: (update: Partial<ModelPreferences>) => void
  className?: string
}

const ModelPreferencesSelectors: React.FC<ModelPreferencesSelectorsProps> = ({
  preferences,
  updatePreferences,
  className,
}) => {
  const [openDropdown, setOpenDropdown] = useState<"main" | "image" | null>(
    null
  )

  // Handle clicking outside of any dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't handle clicks inside dropdowns, their options, or the selectors
      const target = e.target as HTMLElement
      if (
        target.closest(".model-dropdown") ||
        target.closest(".dropdown-option") ||
        target.closest(".model-selector") ||
        target.closest(".selected-value")
      ) {
        return
      }

      // Close dropdown if clicking outside
      setOpenDropdown(null)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleModelChange = (
    key: keyof ModelPreferences,
    value: (typeof preferences)[keyof ModelPreferences]
  ) => {
    updatePreferences({ [key]: value })
    setOpenDropdown(null)
  }

  return (
    <div
      className={`model-selector-container ${className || ""}`}
      style={styles.container}
    >
      <div className="model-selector" style={styles.selector}>
        <label className="model-label" style={styles.label}>
          Main Agent Model
        </label>
        <ModelDropdown
          value={preferences.mainModel}
          onChange={(value) => handleModelChange("mainModel", value)}
          isOpen={openDropdown === "main"}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setOpenDropdown("main")
            } else if (openDropdown === "main") {
              setOpenDropdown(null)
            }
          }}
        />
      </div>
      <div className="model-selector" style={styles.selector}>
        <label className="model-label" style={styles.label}>
          Programmer Model
        </label>
      </div>
      <div className="model-selector" style={styles.selector}>
        <label className="model-label" style={styles.label}>
          Image Generation Model
        </label>
        <ModelDropdownImage
          value={preferences.imageGeneration}
          onChange={(model, size) =>
            handleModelChange("imageGeneration", { model, size })
          }
          isOpen={openDropdown === "image"}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setOpenDropdown("image")
            } else if (openDropdown === "image") {
              setOpenDropdown(null)
            }
          }}
        />
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    width: "100%",
  },
  selector: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    color: "white",
    fontSize: "14px",
    textAlign: "left",
    fontWeight: "500",
  },
} as const

export default ModelPreferencesSelectors
