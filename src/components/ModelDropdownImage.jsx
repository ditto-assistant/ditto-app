import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdExpandMore } from "react-icons/md";
import { FaCrown } from "react-icons/fa";
import { IMAGE_GENERATION_MODELS } from "../constants";
import { styles as modelDropdownStyles } from "./ModelDropdown";

/** @typedef {import('../types').Model} Model */
/** @typedef {import('../types').ModelOption} ModelOption */
/** @typedef {import('../types').ImageGenerationSize} ImageGenerationSize */

/**
 * A dropdown component for selecting AI image generation models with size options
 * @param {object} props
 * @param {{model: Model, size: ImageGenerationSize}} props.value - Currently selected model and size
 * @param {(model: Model, size: ImageGenerationSize) => void} props.onChange - Callback when selection changes
 * @param {boolean} props.hasEnoughBalance - Whether user has enough balance for premium models
 * @param {boolean} [props.inMemoryOverlay=false] - Whether to use absolute positioning for dropdown
 * @returns {JSX.Element} The ModelDropdownImage component
 */
const ModelDropdownImage = ({
  value,
  onChange,
  hasEnoughBalance,
  inMemoryOverlay = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedModel, setExpandedModel] = useState(null);
  const dropdownRef = useRef(null);

  const selectedModel = IMAGE_GENERATION_MODELS.find(
    (model) => model.id === value.model,
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setExpandedModel(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handles the selection of a model and size option
   * @param {Model} model - The selected model
   * @param {ImageGenerationSize} size - The selected size option
   */
  const handleSelect = (model, size) => {
    const modelOption = IMAGE_GENERATION_MODELS.find((m) => m.id === model);
    if (modelOption.isPremium && !hasEnoughBalance) return;
    if (modelOption.isMaintenance) return;
    onChange(model, size);
    setIsOpen(false);
    setExpandedModel(null);
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
          <span style={styles.sizeIndicator}>{value.size.description}</span>
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
            {IMAGE_GENERATION_MODELS.map((model) => (
              <div key={model.id}>
                <motion.div
                  style={{
                    ...styles.option,
                    opacity: model.isPremium && !hasEnoughBalance ? 0.5 : 1,
                    cursor:
                      model.isPremium && !hasEnoughBalance
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() => {
                    if (!(model.isPremium && !hasEnoughBalance)) {
                      setExpandedModel(
                        expandedModel === model.id ? null : model.id,
                      );
                    }
                  }}
                  whileHover={
                    !(model.isPremium && !hasEnoughBalance)
                      ? { backgroundColor: "rgba(88, 101, 242, 0.1)" }
                      : {}
                  }
                >
                  <div style={styles.modelHeader}>
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
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedModel === model.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MdExpandMore style={styles.expandIcon} />
                  </motion.div>
                </motion.div>

                <AnimatePresence>
                  {expandedModel === model.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={styles.sizeOptions}
                    >
                      {model.sizeOptions?.map((size) => (
                        <motion.div
                          key={size.wh}
                          style={{
                            ...styles.sizeOption,
                            backgroundColor:
                              value === model.id && selectedSize === size
                                ? "rgba(88, 101, 242, 0.1)"
                                : "transparent",
                          }}
                          whileHover={{
                            backgroundColor: "rgba(88, 101, 242, 0.1)",
                          }}
                          onClick={() => handleSelect(model.id, size)}
                        >
                          {size.description}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
};

export default ModelDropdownImage;
