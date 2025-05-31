import { useEffect, useState } from "react"
import Modal from "./ui/modals/Modal"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import MemoriesNetworkGraph from "@/screens/MemoriesDashboard/MemoriesNetworkGraph"
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
        <div className="w-full h-full min-h-[500px] flex items-center justify-center">
          <div className="text-muted-foreground">Loading memory network...</div>
        </div>
      </Modal>
    )
  }

  const rootNodeConfig = {
    id: currentRootMemory.id || "root-memory-node",
    label: currentRootMemory.prompt
      ? currentRootMemory.prompt.substring(0, 30) +
        (currentRootMemory.prompt.length > 30 ? "..." : "")
      : "Memory",
    title: `Central Memory: ${currentRootMemory.prompt || "N/A"}`,
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
          />
        ) : (
          <div className="w-full h-full min-h-[500px] flex items-center justify-center">
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
