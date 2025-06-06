import { useRef, useEffect } from "react"
import { Crown, ChevronDown } from "lucide-react"
import { DEFAULT_MODELS } from "../constants"
import { createPortal } from "react-dom"
/**@typedef {import("@/types/llm").Model} Model */
/**@typedef {import("@/types/llm").ModelOption} ModelOption */

/**
 * A dropdown component for selecting AI models
 * @param {object} props
 * @param {Model} props.value - Currently selected model ID
 * @param {(modelId: Model) => void} props.onChange - Callback when model selection changes
 * @param {readonly ModelOption[]} [props.models=DEFAULT_MODELS] - Array of available models
 * @param {boolean} props.isOpen - Whether the dropdown is open
 * @param {(isOpen: boolean) => void} [props.onOpenChange] - Callback when the dropdown state changes
 * @returns {JSX.Element} The ModelDropdown component
 */
const ModelDropdown = ({
  value,
  onChange,
  models = DEFAULT_MODELS,
  isOpen,
  onOpenChange,
}) => {
  const dropdownRef = useRef(null)
  const portalRef = useRef(null)

  const selectedModel = models.find((model) => model.id === value)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        portalRef.current &&
        !portalRef.current.contains(event.target)
      ) {
        onOpenChange?.(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onOpenChange])

  /**
   * Handles the selection of a model
   * @param {Model} modelId - The ID of the selected model
   */
  const handleSelect = (modelId) => {
    const model = models.find((m) => m.id === modelId)
    if (model.isMaintenance) {
      return
    }

    onChange(modelId)
    onOpenChange?.(false)
  }

  const handleClick = (e) => {
    e.stopPropagation()
    onOpenChange?.(!isOpen)
  }

  return (
    <div ref={dropdownRef} style={styles.container}>
      <div style={styles.selectedValue} onClick={handleClick}>
        <div style={styles.selectedContent}>
          <span>{selectedModel?.name}</span>
          {selectedModel?.minimumTier && (
            <span style={styles.premiumBadge}>
              <Crown style={styles.crownIcon} />
              Premium
            </span>
          )}
          {selectedModel?.isFree && <span style={styles.freeBadge}>FREE</span>}
          {selectedModel?.isMaintenance && (
            <span style={styles.maintenanceBadge}>MAINTENANCE</span>
          )}
        </div>
        <div>
          <ChevronDown style={styles.expandIcon} />
        </div>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              top: dropdownRef.current?.getBoundingClientRect().bottom + 4,
              left: dropdownRef.current?.getBoundingClientRect().left,
              width: dropdownRef.current?.getBoundingClientRect().width,
              backgroundColor: "#2f3136",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              zIndex: 999999,
              overflow: "hidden",
              maxHeight: "200px",
              overflowY: "auto",
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {models.map((model) => (
              <div
                key={model.id}
                className="dropdown-option"
                style={{
                  padding: "12px",
                  opacity: model.isMaintenance ? 0.5 : 1,
                  backgroundColor: "#2f3136",
                  color: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background-color 0.2s ease",
                  cursor: model.isMaintenance ? "not-allowed" : "pointer",
                }}
                onClick={() => {
                  handleSelect(model.id)
                }}
                onMouseEnter={(e) => {
                  if (!model.isMaintenance) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(88, 101, 242, 0.1)"
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2f3136"
                }}
              >
                <span>{model.name}</span>
                <div style={styles.badges}>
                  {model.minimumTier && (
                    <span style={styles.premiumBadge}>
                      <Crown style={styles.crownIcon} />
                      Premium
                    </span>
                  )}
                  {model.isFree && <span style={styles.freeBadge}>FREE</span>}
                  {model.isMaintenance && (
                    <span style={styles.maintenanceBadge}>MAINTENANCE</span>
                  )}
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}

const darkModeColors = {
  primary: "#7289DA",
  text: "#FFFFFF",
  foreground: "#23272A",
  cardBg: "#2F3136",
  border: "#1E1F22",
}

export const styles = {
  container: {
    position: "relative",
    width: "100%",
  },
  selectedValue: {
    backgroundColor: darkModeColors.foreground,
    color: darkModeColors.text,
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: `1px solid ${darkModeColors.border}`,
  },
  selectedContent: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: darkModeColors.text,
  },
  expandIcon: {
    fontSize: "20px",
    color: darkModeColors.text,
  },
  dropdown: {
    backgroundColor: darkModeColors.cardBg,
    borderRadius: "8px",
    border: `1px solid ${darkModeColors.border}`,
    overflow: "auto",
    maxHeight: "200px",
    width: "100%",
    zIndex: 10000,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
  },
  option: {
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "background-color 0.2s ease",
    fontSize: "14px",
    backgroundColor: darkModeColors.cardBg,
    color: darkModeColors.text,
    "&:hover": {
      backgroundColor: "rgba(88, 101, 242, 0.1)",
    },
  },
  badges: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  premiumBadge: {
    backgroundColor: "#5865F2",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
  },
  requirementBadge: {
    backgroundColor: "#ED4245",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },
  crownIcon: {
    fontSize: "10px",
    flexShrink: 0,
    color: "#FFFFFF",
  },
  freeBadge: {
    backgroundColor: "#43B581",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },
  maintenanceBadge: {
    backgroundColor: "#ED4245",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },
}

export default ModelDropdown
