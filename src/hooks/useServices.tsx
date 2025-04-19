import { useContext, createContext } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { getPromptModels, getImageModels, PageParams } from "@/api/services"
import { useAuth } from "@/hooks/useAuth"

// Define hook function types using ReturnType for proper inference
type PromptModelsQuery = ReturnType<typeof usePromptModelsQuery>
type ImageModelsQuery = ReturnType<typeof useImageModelsQuery>

type ServicesContextType = {
  promptModels: PromptModelsQuery
  imageModels: ImageModelsQuery
}

const ServicesContext = createContext<ServicesContextType | null>(null)

// Extract query hooks for proper type inference
function usePromptModelsQuery(userId?: string) {
  return useInfiniteQuery({
    queryKey: ["promptModels", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const params: PageParams = {
        page: pageParam as number,
        pageSize: 20
      }
      const result = await getPromptModels(params)
      if (result.err) {
        throw new Error(result.err)
      }
      return result.ok
    },
    initialPageParam: 1,
    getPreviousPageParam: (page) => page?.prevPage,
    getNextPageParam: (page) => {
      if (!page || !page.items) {
        return undefined
      }
      if (page.items.length < page.pageSize) {
        return undefined // there are no more pages
      }
      return page.nextPage
    },
    enabled: !!userId
  })
}

function useImageModelsQuery(userId?: string) {
  return useInfiniteQuery({
    queryKey: ["imageModels", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const params: PageParams = {
        page: pageParam as number,
        pageSize: 20
      }
      const result = await getImageModels(params)
      if (result.err) {
        throw new Error(result.err)
      }
      return result.ok
    },
    initialPageParam: 1,
    getPreviousPageParam: (page) => page?.prevPage,
    getNextPageParam: (page) => {
      if (!page || !page.items) {
        return undefined
      }
      if (page.items.length < page.pageSize) {
        return undefined // there are no more pages
      }
      return page.nextPage
    },
    enabled: !!userId
  })
}

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const promptQuery = usePromptModelsQuery(user?.uid)
  const imageQuery = useImageModelsQuery(user?.uid)

  const value: ServicesContextType = {
    promptModels: promptQuery,
    imageModels: imageQuery
  }

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  )
}

/**
 * Hook to access prompt and image model services with pagination support
 */
export function useServices() {
  const context = useContext(ServicesContext)
  if (!context) {
    throw new Error("useServices must be used within a ServicesProvider")
  }
  return context
}

/**
 * Hook to access only prompt models with pagination support
 */
export function usePromptModels() {
  const services = useServices()
  return services.promptModels
}

/**
 * Hook to access only image models with pagination support
 */
export function useImageModels() {
  const services = useServices()
  return services.imageModels
}
