import { useMemo, useState } from "react"
import { useServices } from "./useServices"
import { useUser } from "./useUser"
import { LLMModel, ImageModel } from "@/api/services"

/**
 * Interface for filter values
 */
export interface FilterValues {
  speed: string | null
  pricing: string | null
  imageSupport: boolean
  vendor: string | null
  modelFamily: string | null
  provider?: string | null
  dimensions?: string | null
  quality?: string | null
}

/**
 * Interface for the return type of useAllServices
 */
export interface AllServicesData {
  // Original data
  promptModels: LLMModel[]
  imageModels: ImageModel[]

  // Grouped data by family
  groupedPromptModels: Record<string, LLMModel[]>
  groupedImageModels: Record<
    string,
    {
      square: ImageModel[]
      landscape: ImageModel[]
      portrait: ImageModel[]
    }
  >

  // Filtered data (based on active filters)
  filteredPromptModels: LLMModel[]
  filteredImageModels: ImageModel[]

  // Loading states
  isLoadingPromptModels: boolean
  isLoadingImageModels: boolean

  // Filter handling
  promptFilters: FilterValues
  imageFilters: FilterValues
  setPromptFilters: (filters: FilterValues) => void
  setImageFilters: (filters: FilterValues) => void
}

/**
 * Extracts the version number from a model family name
 * For example: "Llama 4" returns 4, "GPT-3.5" returns 3.5
 */
function extractVersionNumber(modelName: string): number {
  const matches = modelName.match(/\d+(\.\d+)?/)
  return matches ? parseFloat(matches[0]) : 0
}

/**
 * Compares two models by their family version in descending order
 */
function compareModelsByFamily<
  T extends { modelFamilyDisplayName?: string; provider: string },
>(a: T, b: T): number {
  const familyA = a.modelFamilyDisplayName || a.provider
  const familyB = b.modelFamilyDisplayName || b.provider

  // Extract version numbers
  const versionA = extractVersionNumber(familyA)
  const versionB = extractVersionNumber(familyB)

  if (versionA === versionB) {
    // If versions are the same, sort alphabetically
    return familyA.localeCompare(familyB)
  }

  // Sort by version in descending order (higher numbers first)
  return versionB - versionA
}

/**
 * Hook that fetches all models data and provides pre-processed data
 * with filtering, grouping and other data manipulations
 */
export function useAllServices(): AllServicesData {
  // We need user data for filtering by subscription tier
  const { data: _user } = useUser()
  const { promptModels, imageModels } = useServices()

  // Filter states
  const [promptFilters, setPromptFilters] = useState<FilterValues>({
    speed: null,
    pricing: null,
    imageSupport: false,
    vendor: null,
    modelFamily: null,
  })

  const [imageFilters, setImageFilters] = useState<FilterValues>({
    provider: null,
    dimensions: null,
    quality: null,
    modelFamily: null,
    speed: null, // Required by interface but not used for images
    pricing: null, // Required by interface but not used for images
    imageSupport: false, // Required by interface but not used for images
    vendor: null, // Required by interface but not used for images
  })

  // Loading states
  const isLoadingPromptModels =
    promptModels.isLoading ||
    promptModels.isFetchingNextPage ||
    !promptModels.data

  const isLoadingImageModels =
    imageModels.isLoading || imageModels.isFetchingNextPage || !imageModels.data

  // Get all prompt models by flattening the pages
  const allPromptModels = useMemo(() => {
    if (!promptModels.data) return []
    return promptModels.data.pages.flatMap((page) => page?.items ?? [])
  }, [promptModels.data])

  // Get all image models by flattening the pages
  const allImageModels = useMemo(() => {
    if (!imageModels.data) return []
    return imageModels.data.pages.flatMap((page) => page?.items ?? [])
  }, [imageModels.data])

  // Automatically fetch all pages when more are available
  useMemo(() => {
    if (promptModels.hasNextPage && !promptModels.isFetchingNextPage) {
      promptModels.fetchNextPage()
    }
  }, [promptModels])

  useMemo(() => {
    if (imageModels.hasNextPage && !imageModels.isFetchingNextPage) {
      imageModels.fetchNextPage()
    }
  }, [imageModels])

  // Group prompt models by model family
  const groupedPromptModels = useMemo(() => {
    if (allPromptModels.length === 0) return {}

    return allPromptModels.reduce<Record<string, LLMModel[]>>((acc, model) => {
      // If model has no family, use provider as family
      const family = model.modelFamilyDisplayName || model.provider

      if (!acc[family]) {
        acc[family] = []
      }

      acc[family].push(model)
      return acc
    }, {})
  }, [allPromptModels])

  // Group image models by family and orientation
  const groupedImageModels = useMemo(() => {
    if (allImageModels.length === 0) return {}

    return allImageModels.reduce<
      Record<
        string,
        {
          square: ImageModel[]
          landscape: ImageModel[]
          portrait: ImageModel[]
        }
      >
    >((acc, model) => {
      // Group by family first
      const family = model.modelFamilyDisplayName || model.provider

      if (!acc[family]) {
        acc[family] = {
          square: [],
          landscape: [],
          portrait: [],
        }
      }

      // Then by orientation
      const orientation = model.imageOrientation.toLowerCase()
      if (
        orientation === "square" ||
        orientation === "landscape" ||
        orientation === "portrait"
      ) {
        acc[family][orientation].push(model)
      }

      return acc
    }, {})
  }, [allImageModels])

  // Filter prompt models based on active filters
  const filteredPromptModels = useMemo(() => {
    if (allPromptModels.length === 0) return []

    let filtered = [...allPromptModels]

    // Filter by price/tier (free/premium)
    if (promptFilters.pricing === "free") {
      filtered = filtered.filter((model) => {
        // Models are free if they have no cost OR if their name contains llama-4
        return (
          (model.costPerMillionInputTokens === 0 &&
            model.costPerMillionOutputTokens === 0) ||
          model.name.toLowerCase().includes("llama-4")
        )
      })
    } else if (promptFilters.pricing === "premium") {
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
    if (promptFilters.imageSupport) {
      filtered = filtered.filter((model) => model.attachableImageCount > 0)
    }

    // Filter by vendor
    if (promptFilters.vendor) {
      filtered = filtered.filter(
        (model) => model.provider.toLowerCase() === promptFilters.vendor
      )
    }

    // Filter by model family
    if (promptFilters.modelFamily) {
      filtered = filtered.filter(
        (model) =>
          (model.modelFamilyDisplayName || model.provider) ===
          promptFilters.modelFamily
      )
    }

    // Filter by speed
    if (promptFilters.speed) {
      const speedMap: Record<string, number[]> = {
        slow: [1, 2],
        medium: [3],
        fast: [4],
        insane: [5, 6, 7, 8, 9, 10],
      }

      filtered = filtered.filter((model) => {
        if (!promptFilters.speed) return true
        return (
          speedMap[promptFilters.speed]?.includes(model.speedLevel) || false
        )
      })
    }

    // Sort models by family version in descending order (newer models first)
    filtered.sort(compareModelsByFamily)

    return filtered
  }, [allPromptModels, promptFilters])

  // Filter image models based on active image filters
  const filteredImageModels = useMemo(() => {
    if (allImageModels.length === 0) return []

    let filtered = [...allImageModels]

    // Apply image filters
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
          (model.modelFamilyDisplayName || model.provider) ===
          imageFilters.modelFamily
      )
    }

    // Sort image models by family version in descending order (newer models first)
    filtered.sort(compareModelsByFamily)

    return filtered
  }, [allImageModels, imageFilters])

  return {
    // Original data
    promptModels: allPromptModels,
    imageModels: allImageModels,

    // Grouped data
    groupedPromptModels,
    groupedImageModels,

    // Filtered data
    filteredPromptModels,
    filteredImageModels,

    // Loading states
    isLoadingPromptModels,
    isLoadingImageModels,

    // Filter states
    promptFilters,
    imageFilters,
    setPromptFilters,
    setImageFilters,
  }
}
