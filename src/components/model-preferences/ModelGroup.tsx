import { LLMModel, ImageModel } from "@/api/services";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { ModelCard } from "./ModelCard";
import { useState } from "react";
import { ModelDetails } from "./ModelDetails";

interface ModelGroupProps {
  title: string;
  models: (LLMModel | ImageModel)[];
  userTier: number;
  activeTab: "main" | "programmer" | "image";
  redirectToSubscription?: () => void;
  orientationFilter?: string;
}

export const ModelGroup = ({
  title,
  models,
  userTier,
  activeTab,
  redirectToSubscription,
  orientationFilter,
}: ModelGroupProps) => {
  const { preferences, updatePreferences } = useModelPreferences();
  const [selectedModelDetails, setSelectedModelDetails] = useState<
    LLMModel | ImageModel | null
  >(null);

  if (!models || models.length === 0) return null;

  const isLLMGroup = "costPerMillionInputTokens" in models[0];

  // Filter by orientation if specified
  const filteredModels = orientationFilter
    ? models.filter(
        (model) =>
          "imageOrientation" in model &&
          model.imageOrientation.toLowerCase() === orientationFilter,
      )
    : models;

  if (filteredModels.length === 0) return null;

  // Select appropriate model
  const handleSelectModel = (model: LLMModel | ImageModel) => {
    if (activeTab === "image" && !isLLMGroup) {
      updatePreferences({
        imageGeneration: {
          model: model.name,
          size: preferences?.imageGeneration?.size || {
            wh: "1024x1024",
            description: "Square (1024×1024)",
          },
        },
      });
    } else if (isLLMGroup) {
      updatePreferences({
        [activeTab === "main" ? "mainModel" : "programmerModel"]: model.name,
      });
    }
  };

  // Check if model is selected
  const isModelSelected = (model: LLMModel | ImageModel) => {
    if (activeTab === "image" && !isLLMGroup) {
      return model.name === preferences?.imageGeneration?.model;
    } else if (isLLMGroup) {
      return (
        model.name ===
        preferences?.[activeTab === "main" ? "mainModel" : "programmerModel"]
      );
    }
    return false;
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2 px-4">{title}</h3>

      {orientationFilter && (
        <h4 className="text-sm font-medium mb-2 px-4 capitalize">
          {orientationFilter}
        </h4>
      )}

      <div className="grid grid-cols-1 gap-4 px-4">
        {filteredModels.map((model) => (
          <ModelCard
            key={model.name}
            model={model}
            isSelected={isModelSelected(model)}
            userTier={userTier}
            onSelect={() => handleSelectModel(model)}
            onShowDetails={() => setSelectedModelDetails(model)}
            type={activeTab}
            redirectToSubscription={redirectToSubscription}
          />
        ))}
      </div>

      <ModelDetails
        model={selectedModelDetails}
        isOpen={!!selectedModelDetails}
        onClose={() => setSelectedModelDetails(null)}
      />
    </div>
  );
};

export default ModelGroup;
