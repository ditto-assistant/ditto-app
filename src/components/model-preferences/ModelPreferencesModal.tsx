import { useAllServices } from "@/hooks/useAllServices"
import { useModelPreferences } from "@/hooks/useModelPreferences"

import { ModelList } from "./ModelList"
import { ModelFilters } from "./ModelFilters"
import { SelectedModel } from "./SelectedModel"

import { ScrollArea } from "../ui/scroll-area"

export const ModelPreferencesModal: React.FC = () => {
  // Get preferences to track changes
  const { preferences } = useModelPreferences()

  // Get all models data with filtering, grouping, etc.
  const {
    // Grouped data
    groupedPromptModels,

    // Filtered data
    filteredPromptModels,

    // Loading states
    isLoadingPromptModels,

    // Filters state
    promptFilters,
    setPromptFilters,
  } = useAllServices()

  return (
    <div className="bg-background text-foreground w-full h-full flex flex-col overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="flex flex-col h-full min-h-0">
          {/* Selected model header */}
          <div className="border-b p-4 bg-muted/5">
            <SelectedModel modelType="mainModel" />
          </div>

          {/* Scrollable content area for both filters and model list */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {/* Filters section */}
              <div className="border-b py-4">
                <ModelFilters
                  activeFilters={promptFilters}
                  setActiveFilters={setPromptFilters}
                  filterType="prompt"
                  groupedModels={groupedPromptModels}
                />
              </div>

              {/* Models list */}
              <div className="pt-2">
                {isLoadingPromptModels ? (
                  <div className="flex items-center justify-center h-full">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
                      role="status"
                      aria-label="Loading models"
                    >
                      <span className="sr-only">Loading models...</span>
                    </div>
                  </div>
                ) : (
                  <ModelList
                    key={`main-${preferences?.mainModel || "default"}`}
                    models={filteredPromptModels}
                    activeTab="main"
                    groupedModels={groupedPromptModels}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelPreferencesModal
