import { FaTrash } from "react-icons/fa";
import { toast } from "react-hot-toast";
import Modal from "./ui/modals/Modal";
import ChatMessage from "./ChatMessage";
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer";
import "./MemoryNodeModal.css";
import { usePlatform } from "@/hooks/usePlatform";

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
              <div className="memory-node-content">
                {/* User prompt message using ChatMessage component */}
                <ChatMessage
                  content={nodeData.prompt || "No prompt content available"}
                  timestamp={nodeData.timestamp || Date.now()}
                  isUser={true}
                  bubbleStyles={{
                    text: { fontSize: 14 },
                    chatbubble: { borderRadius: 8, padding: 8 }
                  }}
                />
                
                {/* Only show response if this isn't the root node */}
                {!isRootNode && (
                  <ChatMessage
                    content={nodeData.response || "No response content available"}
                    timestamp={nodeData.timestamp || Date.now()}
                    isUser={false}
                    bubbleStyles={{
                      text: { fontSize: 14 },
                      chatbubble: { borderRadius: 8, padding: 8 }
                    }}
                  />
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
