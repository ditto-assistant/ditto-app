import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdExpandMore } from "react-icons/md";
import { FaCrown } from "react-icons/fa";
import { DEFAULT_MODELS } from "../constants";

/** @typedef {import('../constants').Model} Model */
/** @typedef {import('../constants').ModelOption} ModelOption */

/**
 * A dropdown component for selecting AI models
 * @param {object} props
 * @param {Model} props.value - Currently selected model ID
 * @param {(modelId: Model) => void} props.onChange - Callback when model selection changes
 * @param {boolean} props.hasEnoughBalance - Whether user has enough balance for premium models
 * @param {boolean} [props.inMemoryOverlay=false] - Whether to use absolute positioning for dropdown
 * @param {readonly ModelOption[]} [props.models=DEFAULT_MODELS] - Array of available models
 * @returns {JSX.Element} The ModelDropdown component
 */
const ModelDropdown = ({
  value,
  onChange,
  hasEnoughBalance,
  inMemoryOverlay = false,
  models = DEFAULT_MODELS,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedModel = models.find((model) => model.id === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!hasEnoughBalance && selectedModel?.isPremium) {
      onChange("llama-3-2");
    }
  }, [hasEnoughBalance, selectedModel, onChange]);

  /**
   * Handles the selection of a model from the dropdown
   * @param {Model} modelId - The ID of the selected model
   */
  const handleSelect = (modelId) => {
    const model = models.find((m) => m.id === modelId);
    if (model.isPremium && !hasEnoughBalance) return;
    if (model.isMaintenance) return;
    onChange(modelId);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current.querySelector(".model-dropdown");
      if (dropdown) {
        if (inMemoryOverlay) {
          dropdown.style.position = "absolute";
          dropdown.style.top = "100%";
          dropdown.style.left = "0";
        } else {
          dropdown.style.position = "fixed";
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.left = `${rect.left}px`;

          const dropdownRect = dropdown.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          if (dropdownRect.bottom > viewportHeight) {
            dropdown.style.top = `${rect.top - dropdownRect.height - 4}px`;
          }
        }
        dropdown.style.width = `${rect.width}px`;
      }
    }
  }, [isOpen, inMemoryOverlay]);

  return (
    <div ref={dropdownRef} style={styles.container}>
      <motion.div
        style={styles.selectedValue}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ backgroundColor: "#292B2F" }}
        whileTap={{ scale: 0.99 }}
      >
        <div style={styles.selectedContent}>
          <span>{selectedModel?.name}</span>
          {selectedModel?.isPremium && (
            <span style={styles.premiumBadge}>
              <FaCrown style={styles.crownIcon} />
              Premium
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <MdExpandMore style={styles.expandIcon} />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="model-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              ...styles.dropdown,
              position: inMemoryOverlay ? "absolute" : "fixed",
            }}
          >
            {models.map((model) => (
              <motion.div
                key={model.id}
                style={{
                  ...styles.option,
                  opacity:
                    (model.isPremium && !hasEnoughBalance) ||
                    model.isMaintenance
                      ? 0.5
                      : 1,
                  cursor:
                    (model.isPremium && !hasEnoughBalance) ||
                    model.isMaintenance
                      ? "not-allowed"
                      : "pointer",
                }}
                whileHover={
                  !(model.isPremium && !hasEnoughBalance) &&
                  !model.isMaintenance
                    ? {
                        backgroundColor: "rgba(88, 101, 242, 0.1)",
                      }
                    : {}
                }
                onClick={() => handleSelect(model.id)}
              >
                <span>{model.name}</span>
                <div style={styles.badges}>
                  {model.isPremium && (
                    <>
                      <span style={styles.premiumBadge}>
                        <FaCrown style={styles.crownIcon} />
                        Premium
                      </span>
                      {!hasEnoughBalance && (
                        <span style={styles.requirementBadge}>
                          Requires 1.00B
                        </span>
                      )}
                    </>
                  )}
                  {model.isFree && <span style={styles.freeBadge}>FREE</span>}
                  {model.isMaintenance && (
                    <span style={styles.maintenanceBadge}>MAINTENANCE</span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const darkModeColors = {
  primary: "#7289DA",
  text: "#FFFFFF",
  foreground: "#23272A",
  cardBg: "#2F3136",
  border: "#1E1F22",
};

const styles = {
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
};

const isPremiumModel = (model) => {
  return ["claude-3-5-sonnet", "gemini-1.5-pro"].includes(model);
};

export default ModelDropdown;
