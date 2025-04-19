// No imports needed here
import { useUser } from "@/hooks/useUser"
import { LLMModel, ImageModel } from "@/api/services"
import { ModelGroup } from "./ModelGroup"

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

  if (models.length === 0) {
    return (
      <div className="flex justify-center items-center h-32 text-muted-foreground">
        No models match your filter criteria
      </div>
    )
  }

  const redirectToGeneralTab = () => {
    const generalTab = document.querySelector(
      '.modal-tab[data-tab-id="general"]'
    )
    if (generalTab) {
      ;(generalTab as HTMLElement).click()
    }
  }

  // Render models grouped by family/flavor
  if (isImageModel) {
    return (
      <div className="p-4 w-full h-full overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-2 sm:px-4">
          {Object.entries(groupedModels).map(([family, orientations]) => {
            // For image models, we group by family and then by orientation
            return (
              <div key={family} className="space-y-6">
                {Object.entries(orientations).map(
                  ([orientation, orientationModels]) => {
                    if ((orientationModels as ImageModel[]).length === 0)
                      return null

                    return (
                      <ModelGroup
                        key={`${family}-${orientation}`}
                        title={family}
                        models={orientationModels as ImageModel[]}
                        userTier={user?.planTier || 0}
                        activeTab={activeTab}
                        redirectToSubscription={redirectToGeneralTab}
                        orientationFilter={orientation}
                      />
                    )
                  }
                )}
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
