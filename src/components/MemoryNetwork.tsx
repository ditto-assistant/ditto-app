import { useEffect, useState } from "react"
import Modal from "./ui/modals/Modal"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import MemoriesNetworkGraph from "@/screens/MemoriesDashboard/MemoriesNetworkGraph"
import { LoadingSpinner } from "./ui/loading/LoadingSpinner"
import "./MemoryNetwork.css"

export default function MemoryNetworkModal() {
  const { memories, loading, currentRootMemory } = useMemoryNetwork()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!loading && currentRootMemory && memories !== undefined) {
      setIsReady(true)
    } else {
      setIsReady(false)
    }
  }, [loading, memories, currentRootMemory])

  if (loading || !currentRootMemory) {
    return (
      <Modal id="memoryNetwork" title="Memory Network">
        <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center gap-4">
          <LoadingSpinner size={50} inline={true} />
          <div className="text-muted-foreground">Loading memory network...</div>
        </div>
      </Modal>
    )
  }

  const rootNodeConfig = {
    id: currentRootMemory.id || "root-memory-node",
    label: (() => {
      if (!currentRootMemory.prompt) return "Memory"

      // Clean prompt text by replacing markdown image syntax with emoji
      let cleanPrompt = currentRootMemory.prompt
      if (
        cleanPrompt.includes("![") &&
        cleanPrompt.includes("](") &&
        cleanPrompt.includes(")")
      ) {
        cleanPrompt = cleanPrompt.replace(/!\[[^\]]*\]\([^)]+\)/g, "🖼️")
      }

      return (
        cleanPrompt.substring(0, 30) + (cleanPrompt.length > 30 ? "..." : "")
      )
    })(),
    title: (() => {
      if (!currentRootMemory.prompt) return "Central Memory: N/A"

      // Clean prompt text by replacing markdown image syntax with emoji
      let cleanPrompt = currentRootMemory.prompt
      if (
        cleanPrompt.includes("![") &&
        cleanPrompt.includes("](") &&
        cleanPrompt.includes(")")
      ) {
        cleanPrompt = cleanPrompt.replace(/!\[[^\]]*\]\([^)]+\)/g, "🖼️")
      }

      return `Central Memory: ${cleanPrompt}`
    })(),
    isQueryNode: false,
    originalMemory: currentRootMemory,
    color: "#FF5733",
  }

  return (
    <Modal id="memoryNetwork" title="Memory Network">
      <div className="flex flex-col h-full w-full p-0 m-0">
        {isReady ? (
          <MemoriesNetworkGraph
            memories={memories || []}
            rootNodeConfig={rootNodeConfig}
            context="chatfeed"
            // ChatFeed doesn't need search/reset since it's focused on a specific message
            onSearch={undefined}
            onReset={undefined}
            searchLoading={false}
          />
        ) : (
          <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size={50} inline={true} />
            <div className="text-muted-foreground">
              {loading || !currentRootMemory
                ? "Loading memory network..."
                : "Preparing memory network..."}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
