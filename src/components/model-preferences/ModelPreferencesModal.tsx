import { useState } from "react"
import { useAllServices } from "@/hooks/useAllServices"
import { LayoutGrid, ImageIcon, Code } from "lucide-react"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { triggerHaptic, HapticPattern, VibrationPatterns } from "@/utils/haptics"

import { ModelList } from "./ModelList"
import { ModelFilters } from "./ModelFilters"
import { SelectedModel } from "./SelectedModel"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { ScrollArea } from "../ui/scroll-area"

export const ModelPreferencesModal: React.FC = () => {
  // Track active tab
  const [activeTab, setActiveTab] = useState<"main" | "programmer" | "image">(
    "main"
  )

  // Get preferences to track changes
  const { preferences } = useModelPreferences()

  // Get all models data with filtering, grouping, etc.
  const {
    // Grouped data
    groupedPromptModels,
    groupedImageModels,

    // Filtered data
    filteredPromptModels,
    filteredImageModels,

    // Loading states
    isLoadingPromptModels,
    isLoadingImageModels,

    // Filters state
    promptFilters,
    imageFilters,
    setPromptFilters,
    setImageFilters,
  } = useAllServices()

  return (
    <div className="bg-background text-foreground w-full h-full flex flex-col overflow-hidden">
      <Tabs
        defaultValue="main"
        value={activeTab}
        onValueChange={(val) => {
          const tabValue = val as "main" | "programmer" | "image"
          setActiveTab(tabValue)
          triggerHaptic(HapticPattern.Light)
        }}
        className="w-full h-full flex flex-col"
      >
        <TabsList className="w-full flex justify-center mb-2 p-1 bg-muted/10">
          <TabsTrigger
            value="main"
            className="flex-1 flex items-center justify-center gap-2 py-2"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Main</span>
          </TabsTrigger>
          <TabsTrigger
            value="programmer"
            className="flex-1 flex items-center justify-center gap-2 py-2"
          >
            <Code className="h-4 w-4" />
            <span>Programmer</span>
          </TabsTrigger>
          <TabsTrigger
            value="image"
            className="flex-1 flex items-center justify-center gap-2 py-2"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Image Gen</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="main"
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <ModelList
                        key={`main-${preferences?.mainModel || "default"}`}
                        models={filteredPromptModels}
                        activeTab={activeTab}
                        groupedModels={groupedPromptModels}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="programmer"
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-col h-full min-h-0">
              {/* Selected model header */}
              <div className="border-b p-4 bg-muted/5">
                <SelectedModel modelType="programmerModel" />
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <ModelList
                        key={`programmer-${preferences?.programmerModel || "default"}`}
                        models={filteredPromptModels}
                        activeTab={activeTab}
                        groupedModels={groupedPromptModels}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="image"
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-col h-full min-h-0">
              {/* Selected model header */}
              <div className="border-b p-4 bg-muted/5">
                <SelectedModel modelType="imageGeneration" />
              </div>

              {/* Scrollable content area for both filters and model list */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  {/* Filters section */}
                  <div className="border-b py-4">
                    <ModelFilters
                      activeFilters={imageFilters}
                      setActiveFilters={setImageFilters}
                      filterType="image"
                      groupedModels={groupedImageModels}
                    />
                  </div>

                  {/* Models list */}
                  <div className="pt-2">
                    {isLoadingImageModels ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <ModelList
                        key={`image-${preferences?.imageGeneration?.model || "default"}`}
                        models={filteredImageModels}
                        activeTab={activeTab}
                        groupedModels={groupedImageModels}
                        isImageModel
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ModelPreferencesModal
