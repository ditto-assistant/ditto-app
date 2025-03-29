import { ModelPreferences } from "@/types/llm";
import ModelSelector from "./ModelSelector";

interface ModelPreferencesSelectorsProps {
  preferences: ModelPreferences;
  updatePreferences: (update: Partial<ModelPreferences>) => void;
  hasEnoughBalance: boolean;
  className?: string;
}

function ModelPreferencesSelectors({
  preferences,
  updatePreferences,
  hasEnoughBalance,
  className,
}: ModelPreferencesSelectorsProps) {
  // Our new ModelSelector component handles its own dropdown state internally

  const handleModelChange = (
    key: keyof ModelPreferences,
    value: (typeof preferences)[keyof ModelPreferences],
  ) => {
    updatePreferences({ [key]: value });
  };

  return (
    <div
      className={`model-selector-container ${className || ""}`}
      style={styles.container}
    >
      <div className="model-selector" style={styles.selector}>
        <label className="model-label" style={styles.label}>
          Main Agent Model
        </label>
        <ModelSelector
          value={preferences.mainModel}
          onChange={(value) => handleModelChange("mainModel", value)}
          hasEnoughBalance={hasEnoughBalance}
          isModelType="llm"
        />
      </div>
      <div className="model-selector" style={styles.selector}>
        <label className="model-label" style={styles.label}>
          Programmer Model
        </label>
        <ModelSelector
          value={preferences.programmerModel}
          onChange={(value) => handleModelChange("programmerModel", value)}
          hasEnoughBalance={hasEnoughBalance}
          isModelType="llm"
        />
      </div>
      <div className="model-selector" style={styles.selector}>
        <label className="model-label" style={styles.label}>
          Image Generation Model
        </label>
        <ModelSelector
          value={preferences.imageGeneration.model}
          onChange={(value) => 
            handleModelChange("imageGeneration", { 
              model: value, 
              size: preferences.imageGeneration.size 
            })
          }
          hasEnoughBalance={hasEnoughBalance}
          isModelType="image"
        />
      </div>
    </div>
  );
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
} as const;

export default ModelPreferencesSelectors;
