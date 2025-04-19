import { useState } from "react"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useUser } from "@/hooks/useUser"
import { useAllServices } from "@/hooks/useAllServices"

import { FaRobot, FaMicrochip, FaImage } from "react-icons/fa"

import { ModelList } from "./ModelList"
import { ModelFilters } from "./ModelFilters"
import { SelectedModel } from "./SelectedModel"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { ScrollArea } from "../ui/scroll-area"

export const ModelPreferencesModal: React.FC = () => {
  // These hooks are used by the child components, so we need to call them here
  useUser()
  useModelPreferences()

  // Track active tab
  const [activeTab, setActiveTab] = useState<"main" | "programmer" | "image">(
    "main"
  )

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
        onValueChange={(val) =>
          setActiveTab(val as "main" | "programmer" | "image")
        }
        className="w-full h-full"
      >
        <TabsList className="w-full grid grid-cols-3 sticky top-0 z-10">
          <TabsTrigger value="main" className="flex items-center gap-2">
            <FaRobot className="h-4 w-4" />
            <span>Main</span>
          </TabsTrigger>
          <TabsTrigger value="programmer" className="flex items-center gap-2">
            <FaMicrochip className="h-4 w-4" />
            <span>Programmer</span>
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <FaImage className="h-4 w-4" />
            <span>Image Gen</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="main"
          className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden"
        >
          <ModelFilters
            activeFilters={promptFilters}
            setActiveFilters={setPromptFilters}
            filterType="prompt"
            groupedModels={groupedPromptModels}
          />

          <div className="flex-1 overflow-hidden flex flex-col">
            <SelectedModel modelType="mainModel" />

            <ScrollArea className="flex-1 h-full">
              {isLoadingPromptModels ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ModelList
                  models={filteredPromptModels}
                  activeTab={activeTab}
                  groupedModels={groupedPromptModels}
                />
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent
          value="programmer"
          className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden"
        >
          <ModelFilters
            activeFilters={promptFilters}
            setActiveFilters={setPromptFilters}
            filterType="prompt"
            groupedModels={groupedPromptModels}
          />

          <div className="flex-1 overflow-hidden flex flex-col">
            <SelectedModel modelType="programmerModel" />

            <ScrollArea className="flex-1 h-full">
              {isLoadingPromptModels ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ModelList
                  models={filteredPromptModels}
                  activeTab={activeTab}
                  groupedModels={groupedPromptModels}
                />
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent
          value="image"
          className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden"
        >
          <ModelFilters
            activeFilters={imageFilters}
            setActiveFilters={setImageFilters}
            filterType="image"
            groupedModels={groupedImageModels}
          />

          <div className="flex-1 overflow-hidden flex flex-col">
            <SelectedModel modelType="imageGeneration" />

            <ScrollArea className="flex-1 h-full">
              {isLoadingImageModels ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ModelList
                  models={filteredImageModels}
                  activeTab={activeTab}
                  groupedModels={groupedImageModels}
                  isImageModel
                />
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ModelPreferencesModal
