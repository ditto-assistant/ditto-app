import { useState, useRef, useEffect } from "react"
import { ChevronDown, Crown } from "lucide-react"
import { IMAGE_GENERATION_MODELS } from "../constants"
import { styles as modelDropdownStyles } from "./ModelDropdown"
import { createPortal } from "react-dom"
/**@typedef {import("@/types/llm").Model} Model */
/**@typedef {import("@/types/llm").ImageGenerationSize} ImageGenerationSize */

/**
 * A dropdown component for selecting AI image generation models with size options
 * @param {object} props
 * @param {{model: Model, size: Omit<ImageGenerationSize, "description" | "supportedModels">}} props.value - Currently selected model and size
 * @param {(model: Model, size: ImageGenerationSize) => void} props.onChange - Callback when selection changes
 * @param {boolean} [props.inMemoryOverlay=false] - Whether to use absolute positioning for dropdown
 * @param {boolean} [props.isOpen=false] - Whether the dropdown is open
 * @param {(isOpen: boolean) => void} props.onOpenChange - Callback when the dropdown state changes
 * @returns {JSX.Element} The ModelDropdownImage component
 */
const ModelDropdownImage = ({ value, onChange, isOpen, onOpenChange }) => {
  const [expandedModel, setExpandedModel] = useState(null)
  const dropdownRef = useRef(null)

  const selectedModel = IMAGE_GENERATION_MODELS.find(
    (model) => model.id === value.model
  )

  const handleClick = (e) => {
    e.stopPropagation()
    onOpenChange?.(!isOpen)
  }

  /**
   * Handles the selection of a model and size option
   * @param {Model} model - The selected model
   * @param {ImageGenerationSize} size - The selected size option
   */
  const handleSelect = (model, size) => {
    const modelOption = IMAGE_GENERATION_MODELS.find((m) => m.id === model)
    if (modelOption.isMaintenance) return
    onChange(model, size)
    onOpenChange?.(false)
    setExpandedModel(null)
  }

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const dropdown = dropdownRef.current.querySelector(".model-dropdown")
      if (dropdown) {
        dropdown.style.position = "absolute"
        dropdown.style.top = "100%"
        dropdown.style.left = "0"
        dropdown.style.width = "100%"

        const dropdownRect = dropdown.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        if (dropdownRect.bottom > viewportHeight) {
          dropdown.style.top = "auto"
          dropdown.style.bottom = "100%"
        }
      }
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef} style={styles.container}>
      <div style={styles.selectedValue} onClick={handleClick}>
        <div style={styles.selectedContent}>
          <span>{selectedModel?.name}</span>
          <span style={styles.sizeIndicator}>{value.size.description}</span>
          {selectedModel?.minimumTier && (
            <span style={styles.premiumBadge}>
              <Crown style={styles.crownIcon} />
              Premium
            </span>
          )}
        </div>
        <div>
          <ChevronDown style={styles.expandIcon} />
        </div>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="model-dropdown"
            style={{
              ...styles.dropdown,
              position: "fixed",
              top: dropdownRef.current?.getBoundingClientRect().bottom + 4,
              left: dropdownRef.current?.getBoundingClientRect().left,
              width: dropdownRef.current?.getBoundingClientRect().width,
              zIndex: 999999,
            }}
          >
            {IMAGE_GENERATION_MODELS.map((model) => (
              <div key={model.id} className="dropdown-option">
                <div
                  style={{
                    ...styles.option,
                    opacity: model.isMaintenance ? 0.5 : 1,
                  }}
                  onClick={() => {
                    setExpandedModel(
                      expandedModel === model.id ? null : model.id
                    )
                  }}
                >
                  <div style={styles.modelHeader}>
                    <span>{model.name}</span>
                    <div style={styles.badges}>
                      {model.minimumTier && (
                        <>
                          <span style={styles.premiumBadge}>
                            <Crown style={styles.crownIcon} />
                            Premium
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <ChevronDown style={styles.expandIcon} />
                  </div>
                </div>

                {expandedModel === model.id && (
                  <div style={styles.sizeOptions}>
                    {model.sizeOptions?.map((size) => (
                      <div
                        key={size.wh}
                        style={{
                          ...styles.sizeOption,
                          backgroundColor:
                            value === model.id && selectedSize === size
                              ? "rgba(88, 101, 242, 0.1)"
                              : "transparent",
                        }}
                        onClick={() => handleSelect(model.id, size)}
                      >
                        {size.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}

const styles = {
  ...modelDropdownStyles,
  sizeIndicator: {
    fontSize: "12px",
    color: "#FFFFFF",
    opacity: 0.7,
    marginLeft: "8px",
  },
  modelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sizeOptions: {
    backgroundColor: "#2F3136",
    overflow: "hidden",
  },
  sizeOption: {
    padding: "8px 24px",
    fontSize: "14px",
    color: "#FFFFFF",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
}

export default ModelDropdownImage
