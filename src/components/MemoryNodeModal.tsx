import { FaTrash } from "react-icons/fa";
import { toast } from "react-hot-toast";
import MarkdownRenderer from "./MarkdownRenderer";
import Modal from "./ui/modals/Modal";
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer";
import "./MemoryNodeModal.css";
import { usePlatform } from "@/hooks/usePlatform";
function formatDateTime(timestamp?: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("default", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}

export default function MemoryNodeModal() {
  const { nodeData, onDelete, hideMemoryNode } = useMemoryNodeViewer();
  const { isMobile } = usePlatform();

  // Determine if this is the root node
  const isRootNode = nodeData?.level === 0;

  // Handle deletion with error handling
  const handleDelete = () => {
    try {
      if (nodeData && typeof onDelete === "function") {
        onDelete(nodeData);
      }
      hideMemoryNode();
    } catch (error) {
      console.error("Error deleting node:", error);
      toast.error("Failed to delete memory");
    }
  };

  return (
    <Modal
      id="memoryNodeViewer"
      title={isRootNode ? "Your Prompt" : "Memory"}
      fullScreen={isMobile}
    >
      <div className="memory-node-modal">
        {nodeData && (
          <>
            <div className="node-body">
              <div className="message-container">
                {nodeData.timestamp && (
                  <div className="memory-timestamp">
                    {formatDateTime(nodeData.timestamp)}
                  </div>
                )}
                <div className="user-message">
                  <MarkdownRenderer
                    content={nodeData.prompt || "No prompt content available"}
                  />
                </div>
                {/* Only show divider and response if this isn't the root node */}
                {!isRootNode && (
                  <>
                    <div className="messages-divider" />
                    <div className="ditto-message">
                      <MarkdownRenderer
                        content={
                          nodeData.response || "No response content available"
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="node-footer">
              <button onClick={handleDelete} className="delete-button">
                <FaTrash /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
