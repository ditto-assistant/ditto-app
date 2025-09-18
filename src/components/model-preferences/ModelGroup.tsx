import { LLMModel, ImageModel } from "@/api/services"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { ModelCard } from "./ModelCard"
import { useState } from "react"
import { ModelDetails } from "./ModelDetails"
import { triggerHaptic, VibrationPatterns } from "@/lib/haptics"

interface ModelGroupProps {
  title: string
  models: (LLMModel | ImageModel)[]
  userTier: number
  activeTab: "main" | "programmer" | "image"
  redirectToSubscription?: () => void
  orientationFilter?: string
}

export const ModelGroup = ({
  title,
  models,
  userTier,
  activeTab,
  redirectToSubscription,
  orientationFilter,
}: ModelGroupProps) => {
  // Hooks: must be at top
  const { preferences, updatePreferences } = useModelPreferences()
  const [selectedModelDetails, setSelectedModelDetails] = useState<
    LLMModel | ImageModel | null
  >(null)
  // Guard until preferences are loaded
  if (!preferences) return null

  if (!models || models.length === 0) return null

  const isLLMGroup = "costPerMillionInputTokens" in models[0]

  // Filter by orientation if specified (for image API response grouping)
  const filteredModels = orientationFilter
    ? models.filter(
        (model) =>
          "imageOrientation" in model &&
          model.imageOrientation.toLowerCase() === orientationFilter
      )
    : models

  if (filteredModels.length === 0) return null

  // Determines if an item is selected
  const isModelSelected = (item: LLMModel | ImageModel) => {
    if (activeTab === "image" && !isLLMGroup) {
      // For image variants, match both model name and image size
      // Use non-null assertion since preferences is defined
      return (
        !("costPerMillionInputTokens" in item) &&
        item.name === preferences.imageGeneration.model &&
        item.imageSize === preferences.imageGeneration.size.wh
      )
    }
    if (isLLMGroup) {
      const key = activeTab === "main" ? "mainModel" : "programmerModel"
      return item.name === preferences[key]
    }
    return false
  }

  // Determine if we're in image selector mode
  const isImageMode = activeTab === "image" && !isLLMGroup
  // For image mode, collect all ImageModel variants
  const imageVariants = isImageMode
    ? filteredModels.filter(
        (m): m is ImageModel => !("costPerMillionInputTokens" in m)
      )
    : []
  // Pick selected variant or fallback
  const selectedVariant = isImageMode
    ? imageVariants.find((m) => isModelSelected(m)) || imageVariants[0]
    : null

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2 px-4">{title}</h3>

      {isImageMode && imageVariants.length > 0 ? (
        <div className="px-4">
          <ModelCard
            model={selectedVariant!}
            isSelected={isModelSelected(selectedVariant!)}
            userTier={userTier}
            onSelect={() => {
              triggerHaptic(VibrationPatterns.Success)
              updatePreferences({
                imageGeneration: {
                  model: selectedVariant!.name,
                  size: preferences.imageGeneration.size,
                },
              })
            }}
            onShowDetails={() => setSelectedModelDetails(selectedVariant!)}
            type={activeTab}
            redirectToSubscription={redirectToSubscription}
            variants={imageVariants}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4">
          {filteredModels.map((item) => (
            <ModelCard
              key={item.name}
              model={item}
              isSelected={isModelSelected(item)}
              userTier={userTier}
              onSelect={() => {
                triggerHaptic(VibrationPatterns.Success)
                if (activeTab === "main") {
                  updatePreferences({ mainModel: item.name })
                } else {
                  updatePreferences({ programmerModel: item.name })
                }
              }}
              onShowDetails={() => setSelectedModelDetails(item)}
              type={activeTab}
              redirectToSubscription={redirectToSubscription}
            />
          ))}
        </div>
      )}

      <ModelDetails
        model={selectedModelDetails}
        isOpen={!!selectedModelDetails}
        onClose={() => setSelectedModelDetails(null)}
      />
    </div>
  )
}

export default ModelGroup
