import { useState } from "react"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useUser } from "@/hooks/useUser"
import { useAllServices } from "@/hooks/useAllServices"
import { Button } from "@/components/ui/button"
import {
  SlidersHorizontal,
  LayoutGrid,
  ImageIcon,
  Code,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { ModelList } from "./ModelList"
import { ModelFilters } from "./ModelFilters"
import { SelectedModel } from "./SelectedModel"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { ScrollArea } from "../ui/scroll-area"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "../ui/sidebar"

// Filter toggle component that appears when sidebar is closed
const FilterToggleButton = () => {
  const { open, toggleSidebar } = useSidebar()

  return (
    <Button
      variant="outline"
      size="sm"
      className="fixed right-4 top-32 z-20 shadow-md border bg-background rounded-full p-2 h-10 w-10"
      onClick={toggleSidebar}
      aria-label={open ? "Hide filters" : "Show filters"}
    >
      {open ? (
        <ChevronRight className="h-5 w-5" />
      ) : (
        <>
          <SlidersHorizontal className="h-5 w-5" />
        </>
      )}
    </Button>
  )
}

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
          className="flex-1 flex flex-col overflow-hidden"
        >
          <SidebarProvider defaultOpen={false}>
            <FilterToggleButton />
            <div className="flex h-full overflow-hidden">
              <Sidebar side="right" className="border-l">
                <SidebarHeader className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <SidebarTrigger>
                    <ChevronRight className="h-4 w-4" />
                  </SidebarTrigger>
                </SidebarHeader>
                <SidebarContent>
                  <ModelFilters
                    activeFilters={promptFilters}
                    setActiveFilters={setPromptFilters}
                    filterType="prompt"
                    groupedModels={groupedPromptModels}
                  />
                </SidebarContent>
              </Sidebar>
              <SidebarInset className="flex-1 w-full">
                <div className="flex flex-col h-full w-full">
                  <div className="border-b p-4 bg-muted/5">
                    <SelectedModel modelType="mainModel" />
                  </div>
                  <ScrollArea className="flex-1">
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
              </SidebarInset>
            </div>
          </SidebarProvider>
        </TabsContent>

        <TabsContent
          value="programmer"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <SidebarProvider defaultOpen={false}>
            <FilterToggleButton />
            <div className="flex h-full overflow-hidden">
              <Sidebar side="right" className="border-l">
                <SidebarHeader className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <SidebarTrigger>
                    <ChevronRight className="h-4 w-4" />
                  </SidebarTrigger>
                </SidebarHeader>
                <SidebarContent>
                  <ModelFilters
                    activeFilters={promptFilters}
                    setActiveFilters={setPromptFilters}
                    filterType="prompt"
                    groupedModels={groupedPromptModels}
                  />
                </SidebarContent>
              </Sidebar>
              <SidebarInset className="flex-1 w-full">
                <div className="flex flex-col h-full w-full">
                  <div className="border-b p-4 bg-muted/5">
                    <SelectedModel modelType="programmerModel" />
                  </div>
                  <ScrollArea className="flex-1">
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
              </SidebarInset>
            </div>
          </SidebarProvider>
        </TabsContent>

        <TabsContent
          value="image"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <SidebarProvider defaultOpen={false}>
            <FilterToggleButton />
            <div className="flex h-full overflow-hidden">
              <Sidebar side="right" className="border-l">
                <SidebarHeader className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <SidebarTrigger>
                    <ChevronRight className="h-4 w-4" />
                  </SidebarTrigger>
                </SidebarHeader>
                <SidebarContent>
                  <ModelFilters
                    activeFilters={imageFilters}
                    setActiveFilters={setImageFilters}
                    filterType="image"
                    groupedModels={groupedImageModels}
                  />
                </SidebarContent>
              </Sidebar>
              <SidebarInset className="flex-1 w-full">
                <div className="flex flex-col h-full w-full">
                  <div className="border-b p-4 bg-muted/5">
                    <SelectedModel modelType="imageGeneration" />
                  </div>
                  <ScrollArea className="flex-1">
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
              </SidebarInset>
            </div>
          </SidebarProvider>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ModelPreferencesModal
