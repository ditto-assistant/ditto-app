import { useState, useMemo } from "react"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useUser } from "@/hooks/useUser"
import { useServices } from "@/hooks/useServices"

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

  const [activeTab, setActiveTab] = useState<"main" | "programmer" | "image">(
    "main"
  )

  // State for filters
  const [activeFilters, setActiveFilters] = useState({
    speed: null,
    pricing: null,
    imageSupport: false,
    vendor: null,
    modelFamily: null,
  })

  const [imageFilters, setImageFilters] = useState({
    provider: null,
    dimensions: null,
    quality: null,
    modelFamily: null,
  })

  // Fetch models from API
  const { promptModels, imageModels } = useServices()
  const { data: promptModelsData, isLoading: isLoadingModels } = promptModels
  const { data: imageModelsData, isLoading: isLoadingImageModels } = imageModels

  // Group prompt models by model family
  const groupedPromptModels = useMemo(() => {
    if (!promptModelsData) return {}

    return promptModelsData.reduce((acc, model) => {
      // If model has no family, use provider as family
      const family = model.modelFamily || model.provider

      if (!acc[family]) {
        acc[family] = []
      }

      acc[family].push(model)
      return acc
    }, {})
  }, [promptModelsData])

  // Group image models by family and orientation
  const groupedImageModels = useMemo(() => {
    if (!imageModelsData) return {}

    return imageModelsData.reduce((acc, model) => {
      // Group by family first
      const family = model.modelFamily || model.provider

      if (!acc[family]) {
        acc[family] = {
          square: [],
          landscape: [],
          portrait: [],
        }
      }

      // Then by orientation
      const orientation = model.imageOrientation.toLowerCase()
      if (acc[family][orientation]) {
        acc[family][orientation].push(model)
      }

      return acc
    }, {})
  }, [imageModelsData])

  // Filter models based on active filters
  const filteredPromptModels = useMemo(() => {
    if (!promptModelsData) return []

    let filtered = [...promptModelsData]

    // Apply filters here
    // Filter by price/tier (free/premium)
    if (activeFilters.pricing === "free") {
      filtered = filtered.filter((model) => {
        // Models are free if they have no cost OR if their name contains llama-4
        return (
          (model.costPerMillionInputTokens === 0 &&
            model.costPerMillionOutputTokens === 0) ||
          model.name.toLowerCase().includes("llama-4")
        )
      })
    } else if (activeFilters.pricing === "premium") {
      filtered = filtered.filter((model) => {
        // Models are premium if they have cost AND don't contain llama-4
        return (
          (model.costPerMillionInputTokens > 0 ||
            model.costPerMillionOutputTokens > 0) &&
          !model.name.toLowerCase().includes("llama-4")
        )
      })
    }

    // Filter by image support
    if (activeFilters.imageSupport) {
      filtered = filtered.filter((model) => model.attachableImageCount > 0)
    }

    // Filter by vendor
    if (activeFilters.vendor) {
      filtered = filtered.filter(
        (model) => model.provider.toLowerCase() === activeFilters.vendor
      )
    }

    // Filter by model family
    if (activeFilters.modelFamily) {
      filtered = filtered.filter(
        (model) =>
          (model.modelFamily || model.provider) === activeFilters.modelFamily
      )
    }

    // Filter by speed
    if (activeFilters.speed) {
      const speedMap = {
        slow: [1, 2],
        medium: [3],
        fast: [4],
        insane: [5, 6, 7, 8, 9, 10],
      }

      filtered = filtered.filter((model) => {
        if (!activeFilters.speed) return true
        return speedMap[activeFilters.speed].includes(model.speedLevel)
      })
    }

    return filtered
  }, [activeFilters, promptModelsData])

  // Filter image models based on active image filters
  const filteredImageModels = useMemo(() => {
    if (!imageModelsData) return []

    let filtered = [...imageModelsData]

    // Apply image filters here
    if (imageFilters.provider) {
      filtered = filtered.filter(
        (model) => model.provider.toLowerCase() === imageFilters.provider
      )
    }

    if (imageFilters.dimensions) {
      filtered = filtered.filter(
        (model) =>
          model.imageOrientation.toLowerCase() === imageFilters.dimensions
      )
    }

    if (imageFilters.quality) {
      if (imageFilters.quality === "hd") {
        filtered = filtered.filter((model) =>
          model.modelFlavor.toLowerCase().includes("hd")
        )
      } else {
        filtered = filtered.filter(
          (model) => !model.modelFlavor.toLowerCase().includes("hd")
        )
      }
    }

    if (imageFilters.modelFamily) {
      filtered = filtered.filter(
        (model) =>
          (model.modelFamily || model.provider) === imageFilters.modelFamily
      )
    }

    return filtered
  }, [imageFilters, imageModelsData])

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
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            filterType="prompt"
            groupedModels={groupedPromptModels}
          />

          <div className="flex-1 overflow-hidden flex flex-col">
            <SelectedModel type="mainModel" />

            <ScrollArea className="flex-1 h-full">
              {isLoadingModels ? (
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
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            filterType="prompt"
            groupedModels={groupedPromptModels}
          />

          <div className="flex-1 overflow-hidden flex flex-col">
            <SelectedModel type="programmerModel" />

            <ScrollArea className="flex-1 h-full">
              {isLoadingModels ? (
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
            <SelectedModel type="imageGeneration" />

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
