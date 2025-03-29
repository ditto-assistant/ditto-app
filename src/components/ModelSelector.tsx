import React, { useState } from "react";
import { motion } from "framer-motion";
import { MdExpandMore } from "react-icons/md";
import { FaCrown } from "react-icons/fa";
import { createPortal } from "react-dom";
import ModelCard from "./ModelCard";
import { useServices } from "@/hooks/useServices";
import type { Model, ModelOption } from "@/types/llm";

interface ModelSelectorProps {
  value: Model;
  onChange: (modelId: Model) => void;
  hasEnoughBalance: boolean;
  isModelType?: "llm" | "image"; // Specify which type of models to display
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  hasEnoughBalance,
  isModelType = "llm"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = React.useRef<HTMLDivElement | null>(null);
  
  // Fetch services using our hook
  const { llms, imageModels, loading, error } = useServices();
  
  // Select appropriate models based on type
  const models = isModelType === "image" ? imageModels : llms;
  
  // Find the currently selected model
  const selectedModel = models.find(model => model.id === value) || models[0];

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div ref={selectorRef} style={{ position: "relative", width: "100%" }}>
      {/* Selected model display - when collapsed */}
      <motion.div
        style={{
          backgroundColor: "#23272A",
          color: "#FFFFFF",
          padding: "10px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #1E1F22",
        }}
        onClick={toggleDropdown}
        whileHover={{ backgroundColor: "#292B2F" }}
        whileTap={{ scale: 0.99 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <img 
            src={selectedModel?.iconUrl || `/icons/providers/${selectedModel?.vendor || 'default'}.png`} 
            alt={selectedModel?.vendor || 'AI'} 
            style={{ width: "20px", height: "20px", borderRadius: "4px" }}
            onError={(e) => {
              e.currentTarget.src = "/icons/round/android-chrome-192x192.png";
            }}
          />
          <span>{selectedModel?.name}</span>
          {selectedModel?.isPremium && (
            <span style={{ 
              backgroundColor: "#5865F2", 
              color: "#FFFFFF", 
              borderRadius: "4px", 
              padding: "2px 6px", 
              fontSize: "10px", 
              display: "flex", 
              alignItems: "center", 
              gap: "4px" 
            }}>
              <FaCrown style={{ fontSize: "10px" }} /> Premium
            </span>
          )}
          {selectedModel?.isFree && (
            <span style={{ 
              backgroundColor: "#43B581", 
              color: "#FFFFFF", 
              borderRadius: "4px", 
              padding: "2px 6px", 
              fontSize: "10px"
            }}>
              FREE
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <MdExpandMore style={{ fontSize: "20px", color: "#FFFFFF" }} />
        </motion.div>
      </motion.div>

      {/* Dropdown with model cards */}
      {isOpen && selectorRef.current && createPortal(
        <div
          style={{
            position: "fixed",
            top: selectorRef.current.getBoundingClientRect().bottom + 8,
            left: selectorRef.current.getBoundingClientRect().left,
            width: selectorRef.current.getBoundingClientRect().width,
            backgroundColor: "#2f3136",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            zIndex: 999999,
            maxHeight: "400px",
            overflowY: "auto",
            padding: "8px",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {loading ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#FFFFFF" }}>
              Loading models...
            </div>
          ) : error ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#ED4245" }}>
              {error}
            </div>
          ) : (
            models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={model.id === value}
                onSelect={() => {
                  onChange(model.id);
                  setIsOpen(false);
                }}
                hasEnoughBalance={!model.isPremium || hasEnoughBalance}
              />
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ModelSelector;