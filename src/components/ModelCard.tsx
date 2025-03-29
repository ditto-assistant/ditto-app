import React from "react";
import { motion } from "framer-motion";
import { FaCrown } from "react-icons/fa";
import { FaBolt, FaFlask, FaMoneyBillWave, FaRobot } from "react-icons/fa";
import type { ModelOption } from "@/types/llm";

const StatBar = ({ 
  value, 
  maxValue, 
  label, 
  color, 
  icon,
  inverse = false 
}: { 
  value: number; 
  maxValue: number; 
  label: string; 
  color: string;
  icon: React.ReactNode;
  inverse?: boolean; // For cost, higher is worse so we invert the display
}) => {
  // For non-inverted stats (like speed or intelligence), higher values show fuller bars
  // For inverted stats (like cost), higher values show smaller bars
  const percentage = inverse 
    ? Math.min(100, 100 - ((value - 1) / (maxValue - 1)) * 100) // Transform 1-5 to 100%-0%
    : Math.min(100, (value / maxValue) * 100);
  
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ marginRight: "6px" }}>{icon}</div>
        <span style={{ fontSize: "12px", fontWeight: "bold" }}>{label}</span>
        
        {/* Show 1-5 rating as text */}
        <span style={{ fontSize: "10px", marginLeft: "auto", opacity: 0.7 }}>
          {inverse ? (maxValue - value + 1) : value}/{maxValue}
        </span>
      </div>
      <div style={{ 
        width: "100%", 
        height: "12px", 
        backgroundColor: "#2c2f33", 
        borderRadius: "6px",
        overflow: "hidden"
      }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: "100%", 
          backgroundColor: color,
          borderRadius: "6px",
          transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );
};

interface ModelCardProps {
  model: ModelOption;
  isSelected: boolean;
  onSelect: () => void;
  hasEnoughBalance: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({ 
  model, 
  isSelected, 
  onSelect,
  hasEnoughBalance
}) => {
  // Calculate stat values based on model properties
  const speedValue = model.speedLevel === "insane" ? 5 
    : model.speedLevel === "fast" ? 4 
    : model.speedLevel === "medium" ? 3 
    : 2;
  
  // Intelligence is based on model's intelligence level or cost
  const intelligenceValue = model.pricing?.intelligenceLevel === "very high" ? 5
    : model.pricing?.intelligenceLevel === "high" ? 4
    : model.pricing?.intelligenceLevel === "medium" ? 3
    : model.pricing?.intelligenceLevel === "low" ? 2
    : 3;
  
  // Calculate cost value dynamically
  // For image models, use costPerImage; for text models, use inputTokens cost
  let costValue = 1;
  
  if (model.pricing) {
    if (model.pricing.costPerImage) {
      // For image models, normalize on a 1-5 scale
      // A lower cost is better (lower bar)
      if (model.pricing.costPerImage < 0.02) costValue = 1; // Very cheap
      else if (model.pricing.costPerImage < 0.05) costValue = 2; // Cheap
      else if (model.pricing.costPerImage < 0.1) costValue = 3; // Medium
      else if (model.pricing.costPerImage < 0.2) costValue = 4; // Expensive
      else costValue = 5; // Very expensive
    } 
    else if (model.pricing.inputTokens) {
      // For LLMs, normalize on a 1-5 scale
      // A lower cost is better (lower bar)
      if (model.pricing.inputTokens < 0.5) costValue = 1; // Very cheap
      else if (model.pricing.inputTokens < 1.5) costValue = 2; // Cheap
      else if (model.pricing.inputTokens < 3) costValue = 3; // Medium
      else if (model.pricing.inputTokens < 6) costValue = 4; // Expensive
      else costValue = 5; // Very expensive
    }
  }

  // Disabled if premium without enough balance
  const isDisabled = model.isPremium && !hasEnoughBalance;
  
  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      style={{
        padding: "12px",
        borderRadius: "8px",
        backgroundColor: isSelected ? "#4f545c" : "#36393f",
        border: isSelected ? "2px solid #5865F2" : "2px solid transparent",
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
        width: "100%",
        marginBottom: "10px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
      }}
      onClick={() => {
        if (!isDisabled) {
          onSelect();
        }
      }}
    >
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img 
            src={model.iconUrl || `/icons/providers/${model.vendor || 'default'}.png`} 
            alt={model.vendor || 'AI'} 
            style={{ width: "24px", height: "24px", borderRadius: "4px" }}
            onError={(e) => {
              e.currentTarget.src = "/icons/round/android-chrome-192x192.png";
            }}
          />
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>{model.name}</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {model.isPremium && (
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
          {model.isFree && (
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
      </div>
      
      <div style={{ padding: "5px 0" }}>
        {/* Speed stat */}
        <StatBar 
          value={speedValue} 
          maxValue={5} 
          label="Speed" 
          color="#43B581" 
          icon={<FaBolt color="#43B581" size={12} />}
        />
        
        {/* Intelligence stat */}
        <StatBar 
          value={intelligenceValue} 
          maxValue={5} 
          label="Intelligence" 
          color="#5865F2" 
          icon={<FaRobot color="#5865F2" size={12} />}
        />
        
        {/* Cost stat - Inverted so higher cost = smaller bar */}
        <StatBar 
          value={costValue} 
          maxValue={5} 
          label="Cost" 
          color={
            costValue <= 2 ? "#43B581" :  // Green for low cost (1-2)
            costValue === 3 ? "#FAA61A" : // Yellow for medium cost (3)
            "#ED4245"                     // Red for high cost (4-5)
          }
          icon={
            <FaMoneyBillWave 
              color={
                costValue <= 2 ? "#43B581" :  // Green for low cost (1-2)
                costValue === 3 ? "#FAA61A" : // Yellow for medium cost (3)
                "#ED4245"                     // Red for high cost (4-5)
              } 
              size={12} 
            />
          }
          inverse={true}
        />
      </div>
      
      {model.pricing && (
        <div style={{ 
          marginTop: "8px", 
          fontSize: "11px", 
          color: "#B9BBBE",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "6px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "6px"
        }}>
          <div style={{ 
            fontSize: "10px", 
            textTransform: "uppercase", 
            marginBottom: "2px",
            color: "#7289DA",
            fontWeight: "bold" 
          }}>
            Pricing Details
          </div>
          
          {model.pricing.inputTokens && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "bold" }}>Input:</span> 
              <span style={{ 
                color: costValue <= 2 ? "#43B581" : costValue === 3 ? "#FAA61A" : "#ED4245"
              }}>
                ${model.pricing.inputTokens.toFixed(3)}/M tokens
              </span>
            </div>
          )}
          
          {model.pricing.outputTokens && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "bold" }}>Output:</span> 
              <span style={{ 
                color: costValue <= 2 ? "#43B581" : costValue === 3 ? "#FAA61A" : "#ED4245" 
              }}>
                ${model.pricing.outputTokens.toFixed(3)}/M tokens
              </span>
            </div>
          )}
          
          {model.pricing.costPerImage && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "bold" }}>Per Image:</span> 
              <span style={{ 
                color: costValue <= 2 ? "#43B581" : costValue === 3 ? "#FAA61A" : "#ED4245" 
              }}>
                ${model.pricing.costPerImage.toFixed(3)}
              </span>
            </div>
          )}
          
          {model.pricing.intelligenceLevel && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "bold" }}>Intelligence:</span> 
              <span style={{ color: "#5865F2" }}>
                {model.pricing.intelligenceLevel.charAt(0).toUpperCase() + model.pricing.intelligenceLevel.slice(1)}
              </span>
            </div>
          )}
        </div>
      )}
      
      {isDisabled && (
        <div style={{ 
          marginTop: "8px", 
          fontSize: "11px", 
          color: "#ED4245", 
          textAlign: "center",
          fontWeight: "bold" 
        }}>
          Requires more balance
        </div>
      )}
    </motion.div>
  );
};

export default ModelCard;