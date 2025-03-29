import { useQuery } from "@tanstack/react-query";
import { getServices } from "@/api/services";
import type { ModelOption } from "@/types/llm";
import { DEFAULT_MODELS, IMAGE_GENERATION_MODELS } from "@/constants";

interface UseServicesReturn {
  llms: ModelOption[];
  imageModels: ModelOption[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch available LLM and image generation services using React Query
 */
export function useServices(): UseServicesReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const result = await getServices();
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      return result;
    },
    // Stale time set to 5 minutes - services don't change that often
    staleTime: 5 * 60 * 1000,
    // Cache time set to 1 hour
    gcTime: 60 * 60 * 1000,
  });
  
  // Provide default models if data isn't available yet
  const services = data || {
    llms: DEFAULT_MODELS,
    imageModels: IMAGE_GENERATION_MODELS
  };
  
  const refetchServices = async () => {
    try {
      await refetch();
    } catch (err) {
      console.error("Error refetching services:", err);
    }
  };
  
  return {
    llms: services.llms,
    imageModels: services.imageModels,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: refetchServices
  };
}