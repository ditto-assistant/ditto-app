import { Trash } from "lucide-react"
import { toast } from "sonner"
import Modal from "./ui/modals/Modal"
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer"
import "./MemoryNodeModal.css"
import MarkdownRenderer from "./MarkdownRenderer"

export default function MemoryNodeModal() {
  const { nodeData, onDelete, hideMemoryNode } = useMemoryNodeViewer()

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

  return (
    <Modal id="memoryNodeViewer" title={isRootNode ? "Your Prompt" : "Memory"}>
      <div className="memory-node-modal">
        {nodeData && (
          <>
            <div className="node-body memory-scroll-container">
              <div className="memory-node-content">
                <div className="memory-messages-wrapper">
                  {/* User prompt message */}
                  <div className="memory-prompt">
                    <h4>Prompt:</h4>
                    <div className="memory-text">
                      {nodeData.prompt || "No prompt content available"}
                    </div>
                  </div>
                </div>

                <div className="memory-messages-wrapper">
                  {/* Response with Markdown rendering */}
                  <div className="memory-response">
                    <h4>Response:</h4>
                    <div className="markdown-wrapper">
                      <MarkdownRenderer
                        content={
                          nodeData.response || "No response content available"
                        }
                        className="memory-markdown"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="node-footer">
              <button onClick={handleDelete} className="delete-button">
                <Trash /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
