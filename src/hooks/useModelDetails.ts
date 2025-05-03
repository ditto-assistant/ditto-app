import { useQuery } from "@tanstack/react-query"
import { getLLMModel, getImageModel } from "@/api/modelServices"
import { Model } from "@/types/llm"
import { useAuth } from "@/hooks/useAuth"

/**
 * Hook for fetching a specific LLM model by ID
 */
export function useLLMModelDetails(modelId: Model | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["llmModel", modelId, user?.uid],
    queryFn: async () => {
      if (!modelId) {
        throw new Error("Model ID is required")
      }
      const result = await getLLMModel(modelId)
      if (result.err) {
        throw new Error(result.err)
      }
      return result.ok
    },
    enabled: !!modelId && !!user,
  })
}

/**
 * Hook for fetching a specific image model by ID
 */
export function useImageModelDetails(modelId: Model | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["imageModel", modelId, user?.uid],
    queryFn: async () => {
      if (!modelId) {
        throw new Error("Model ID is required")
      }
      const result = await getImageModel(modelId)
      if (result.err) {
        throw new Error(result.err)
      }
      return result.ok
    },
    enabled: !!modelId && !!user,
  })
}

/**
 * Hook that selects the appropriate model details hook based on the model type
 */
export function useModelDetails(
  modelId: Model | undefined,
  isImageModel: boolean
) {
  const llmQuery = useLLMModelDetails(isImageModel ? undefined : modelId)
  const imageQuery = useImageModelDetails(isImageModel ? modelId : undefined)

  return isImageModel ? imageQuery : llmQuery
}
