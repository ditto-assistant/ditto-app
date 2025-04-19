import { useCallback } from "react";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { usePromptModels, useImageModels } from "@/hooks/useServices";
import { Badge } from "../ui/badge";
import { ImageModel } from "@/api/services";

interface SelectedModelProps {
  type: "mainModel" | "programmerModel" | "imageGeneration";
}

export const SelectedModel = ({ type }: SelectedModelProps) => {
  const { preferences } = useModelPreferences();
  const { data: promptModels } = usePromptModels();
  const { data: imageModels } = useImageModels();

  const getSelectedModelDetails = useCallback(
    (modelType: "mainModel" | "programmerModel" | "imageGeneration") => {
      if (!preferences || !promptModels || !imageModels) return null;

      if (modelType === "imageGeneration") {
        const selectedModel = imageModels.find(
          (model) => model.name === preferences.imageGeneration.model,
        );
        return selectedModel;
      }

      // Find the model from the API
      const selectedModelId = preferences[modelType];
      const selectedModel = promptModels.find(
        (model) => model.name === selectedModelId,
      );

      return selectedModel;
    },
    [preferences, promptModels, imageModels],
  );

  const selectedModel = getSelectedModelDetails(type);

  if (!selectedModel) {
    return (
      <div className="border-b p-4">
        <h3 className="text-sm text-muted-foreground font-medium mb-1">
          Selected Model
        </h3>
        <div className="text-lg font-semibold">No model selected</div>
      </div>
    );
  }

  return (
    <div className="border-b p-4">
      <h3 className="text-sm text-muted-foreground font-medium mb-1">
        Selected Model
      </h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">
            {selectedModel.displayName}
          </div>
          {type === "imageGeneration" && preferences?.imageGeneration?.size && (
            <div className="text-sm text-muted-foreground">
              {preferences.imageGeneration.size.description}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {type === "imageGeneration" && (
            <Badge variant="outline" className="text-xs">
              {(selectedModel as ImageModel).imageSize}
            </Badge>
          )}

          {(type === "mainModel" || type === "programmerModel") && (
            <Badge variant="outline" className="text-xs">
              {selectedModel.modelFlavor}
            </Badge>
          )}

          {selectedModel.provider && (
            <Badge variant="secondary" className="text-xs">
              {selectedModel.provider}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectedModel;
