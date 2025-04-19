import { useContext, createContext } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  getPromptModels,
  getImageModels,
  LLMModel,
  ImageModel,
  PageParams,
} from "@/api/services";
import { useAuth } from "@/hooks/useAuth";

type ServicesContextType = {
  promptModels: {
    data: LLMModel[] | undefined;
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    refetch: () => void;
  };
  imageModels: {
    data: ImageModel[] | undefined;
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    refetch: () => void;
  };
};

const ServicesContext = createContext<ServicesContextType | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Query for prompt models
  const promptQuery = useInfiniteQuery({
    queryKey: ["promptModels", user?.uid],
    queryFn: async ({ pageParam = 1 }) => {
      const params: PageParams = {
        page: pageParam as number,
        pageSize: 50,
      };
      const result = await getPromptModels(params);
      if (result.err) {
        throw new Error(result.err);
      }
      return result.ok;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.items) {
        return undefined;
      }
      return lastPage.nextPage;
    },
    enabled: !!user,
  });

  // Query for image models
  const imageQuery = useInfiniteQuery({
    queryKey: ["imageModels", user?.uid],
    queryFn: async ({ pageParam = 1 }) => {
      const params: PageParams = {
        page: pageParam as number,
        pageSize: 50,
      };
      const result = await getImageModels(params);
      if (result.err) {
        throw new Error(result.err);
      }
      return result.ok;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.items) {
        return undefined;
      }
      return lastPage.nextPage;
    },
    enabled: !!user,
  });

  // Flatten the paginated data into a single array
  const flattenedPromptModels = promptQuery.data?.pages.flatMap(
    (page) => page?.items ?? [],
  );
  const flattenedImageModels = imageQuery.data?.pages.flatMap(
    (page) => page?.items ?? [],
  );

  const value: ServicesContextType = {
    promptModels: {
      data: flattenedPromptModels,
      isLoading: promptQuery.isLoading,
      isFetchingNextPage: promptQuery.isFetchingNextPage,
      hasNextPage: !!promptQuery.hasNextPage,
      fetchNextPage: promptQuery.fetchNextPage,
      refetch: promptQuery.refetch,
    },
    imageModels: {
      data: flattenedImageModels,
      isLoading: imageQuery.isLoading,
      isFetchingNextPage: imageQuery.isFetchingNextPage,
      hasNextPage: !!imageQuery.hasNextPage,
      fetchNextPage: imageQuery.fetchNextPage,
      refetch: imageQuery.refetch,
    },
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
}

/**
 * Hook to access prompt and image model services with pagination support
 */
export function useServices() {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return context;
}

/**
 * Hook to access only prompt models with pagination support
 */
export function usePromptModels() {
  const services = useServices();
  return services.promptModels;
}

/**
 * Hook to access only image models with pagination support
 */
export function useImageModels() {
  const services = useServices();
  return services.imageModels;
}
