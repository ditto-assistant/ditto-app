// No imports needed here
import { useUser } from "@/hooks/useUser"
import { LLMModel, ImageModel } from "@/api/services"
import ModelCard from "./ModelCard"
import ModelGroup from "./ModelGroup"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useModal } from "@/hooks/useModal"

interface ModelListProps {
  models: (LLMModel | ImageModel)[]
  activeTab: "main" | "programmer" | "image"
  groupedModels: Record<string, unknown>
  isImageModel?: boolean
}

export const ModelList = ({
  models,
  activeTab,
  groupedModels,
  isImageModel = false,
}: ModelListProps) => {
  const { data: user } = useUser()
  const { createOpenHandler } = useModal()
  const { preferences, updatePreferences } = useModelPreferences()
  if (!preferences) return null

  if (models.length === 0) {
    return (
      <div className="flex justify-center items-center h-32 text-muted-foreground">
        No models match your filter criteria
      </div>
    )
  }

  // Open Settings modal with initial tab "general" (Subscription)
  const openSettingsGeneral = createOpenHandler("settings", "general")
  const redirectToGeneralTab = () => {
    openSettingsGeneral()
  }

  // Render models grouped by family/flavor
  if (isImageModel) {
    return (
      <div className="p-4 w-full h-full overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-2 sm:px-4">
          {Object.entries(groupedModels).map(([family, orientations]) => {
            const variants = Object.values(
              orientations as Record<string, ImageModel[]>
            ).flat()
            if (variants.length === 0) return null
            // Pick selected variant from preferences or fallback
            const selected =
              variants.find(
                (v) =>
                  v.name === preferences.imageGeneration.model &&
                  v.imageSize === preferences.imageGeneration.size.wh
              ) || variants[0]
            return (
              <div key={family} className="space-y-2">
                <ModelCard
                  title={family}
                  model={selected}
                  isSelected={
                    selected.name === preferences.imageGeneration.model &&
                    selected.imageSize === preferences.imageGeneration.size.wh
                  }
                  userTier={user?.planTier || 0}
                  onSelect={() => {
                    updatePreferences({
                      imageGeneration: {
                        model: selected.name,
                        size: preferences.imageGeneration.size,
                      },
                    })
                  }}
                  onShowDetails={() =>
                    createOpenHandler("settings", "models")()
                  }
                  type={activeTab}
                  redirectToSubscription={redirectToGeneralTab}
                  variants={variants}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  } else {
    return (
      <div className="p-4 w-full h-full overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 px-2 sm:px-4">
          {Object.entries(groupedModels).map(([family, familyModels]) => {
            // Skip empty families or those filtered out
            const filteredModels = (familyModels as LLMModel[]).filter(
              (model) => models.some((m) => m.name === model.name)
            )

            if (filteredModels.length === 0) return null

            return (
              <ModelGroup
                key={family}
                title={family}
                models={filteredModels}
                userTier={user?.planTier || 0}
                activeTab={activeTab}
                redirectToSubscription={redirectToGeneralTab}
              />
            )
          })}
        </div>
      </div>
    )
  }
}

export default ModelList
