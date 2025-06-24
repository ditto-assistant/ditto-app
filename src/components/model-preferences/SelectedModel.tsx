import React, { useMemo } from "react"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { Badge } from "../ui/badge"
import { useModelDetails } from "@/hooks/useModelDetails"
import { Model } from "@/types/llm"
import { ImageModel } from "@/api/modelServices"

interface SelectedModelProps {
  modelType: "mainModel" | "programmerModel" | "imageGeneration"
}

export function SelectedModel({ modelType }: SelectedModelProps) {
  const { preferences } = useModelPreferences()

  // Get the selected model ID
  const selectedModelId = useMemo(() => {
    if (!preferences) return undefined
    return modelType === "imageGeneration"
      ? (preferences.imageGeneration.model as Model)
      : (preferences[modelType] as Model)
  }, [preferences, modelType])

  // Use the combined hook with isImageModel flag
  const isImageModel = modelType === "imageGeneration"
  const { data: selectedModel, isLoading } = useModelDetails(
    selectedModelId,
    isImageModel
  )

  if (isLoading) {
    // Render invisible placeholders matching the real content structure to prevent layout shift
    return (
      <div className="flex flex-col gap-1">
        {/* Title placeholder */}
        <div className="font-medium text-transparent select-none">
          Loading...
        </div>
        {/* Size placeholder for image models */}
        {isImageModel && (
          <div className="text-xs text-transparent select-none">Loading...</div>
        )}
        {/* Badges placeholder row */}
        <div className="flex items-center gap-1 mt-1">
          {/* Flavor or size badge placeholder */}
          <Badge variant="outline" className="invisible text-xs">
            placeholder
          </Badge>
          {/* Provider badge placeholder */}
          <Badge variant="secondary" className="invisible text-xs">
            placeholder
          </Badge>
        </div>
      </div>
    )
  }

  if (!selectedModel) {
    return (
      <div className="border-b border-ditto-glass-border p-4 glass-interactive">
        <h3 className="text-sm text-ditto-secondary font-medium mb-1">
          Selected Model
        </h3>
        <div className="text-lg font-semibold text-ditto-secondary">
          No model selected
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="font-medium text-ditto-primary">{selectedModel.displayName}</div>

      <div className="flex items-center gap-1 mt-1">
        {/* Show specific badges based on model type */}
        {isImageModel && (
          <Badge variant="outline" className="text-xs glass-interactive text-ditto-secondary border-ditto-glass-border">
            {(selectedModel as ImageModel).imageSize}
          </Badge>
        )}

        {!isImageModel && (
          <Badge variant="outline" className="text-xs glass-interactive text-ditto-secondary border-ditto-glass-border">
            {selectedModel.modelFlavor}
          </Badge>
        )}

        {/* Always show provider badge */}
        {selectedModel.provider && (
          <Badge variant="secondary" className="text-xs glass-interactive text-ditto-primary">
            {selectedModel.provider}
          </Badge>
        )}
      </div>
    </div>
  )
}

export default SelectedModel
