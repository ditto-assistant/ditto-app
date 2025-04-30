import { Trash } from "lucide-react"
import { toast } from "sonner"
import Modal from "./ui/modals/Modal"
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer"
import ChatMessage from "./ChatMessage"
import { Button } from "./ui/button"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"

export default function MemoryNodeModal() {
  const { nodeData, onDelete, hideMemoryNode } = useMemoryNodeViewer()
  const { showMemoryNetwork } = useMemoryNetwork()

  // Determine if this is the root node
  const isRootNode = nodeData?.level === 0 || nodeData?.depth === 0

  // Handle deletion with error handling
  const handleDelete = () => {
    try {
      if (nodeData && typeof onDelete === "function") {
        onDelete(nodeData)
      }
      hideMemoryNode()
    } catch (error) {
      console.error("Error deleting node:", error)
      toast.error("Failed to delete memory")
    }
  }

  // Handle copying message content
  const handleCopy = (content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"))
  }

  return (
    <Modal id="memoryNodeViewer" title={isRootNode ? "Your Prompt" : "Memory"}>
      <div className="flex flex-col h-full w-full overflow-hidden relative">
        {nodeData && (
          <>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 max-h-[calc(100%-60px)]">
              <div className="flex flex-col gap-6 pb-8 w-full">
                {/* User prompt message */}
                <ChatMessage
                  content={nodeData.prompt || "No prompt content available"}
                  timestamp={
                    nodeData.timestamp
                      ? new Date(nodeData.timestamp)
                      : new Date()
                  }
                  isUser={true}
                  menuProps={{
                    onCopy: () => handleCopy(nodeData.prompt || ""),
                    onDelete: handleDelete,
                    onShowMemories: () => showMemoryNetwork(nodeData),
                  }}
                />

                {/* Response message */}
                <ChatMessage
                  content={nodeData.response || "No response content available"}
                  timestamp={
                    nodeData.timestamp
                      ? new Date(nodeData.timestamp)
                      : new Date()
                  }
                  isUser={false}
                  menuProps={{
                    onCopy: () => handleCopy(nodeData.response || ""),
                    onDelete: handleDelete,
                    onShowMemories: () => showMemoryNetwork(nodeData),
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end p-3 border-t min-h-[60px] bg-background/5 z-10">
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center gap-2"
              >
                <Trash className="h-4 w-4" /> Delete
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
