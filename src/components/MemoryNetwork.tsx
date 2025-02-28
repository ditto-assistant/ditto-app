import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { DataSet } from "vis-data";
import MarkdownRenderer from "./MarkdownRenderer";
import Modal from "./ui/modals/Modal";
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion";
import { useMemoryNetwork, Memory } from "@/hooks/useMemoryNetwork";
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer";
import { Network, Node, Edge } from "vis-network";
import "./MemoryNetwork.css";

const formatDateTime = (timestamp: number) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("default", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
};

const TableView: React.FC<{
  memories: Memory[];
}> = ({ memories }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const { confirmMemoryDeletion } = useMemoryDeletion();
  const { showMemoryNode } = useMemoryNodeViewer();

  const handleDelete = async (memory: Memory) => {
    if (!memory) return;
    confirmMemoryDeletion(memory.id, { isMessage: false });
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  };

  const handleViewMemory = (memory: Memory) => {
    // Create an adapter function to convert MemoryNodeData to Memory
    const deleteAdapter = (node: any) => {
      handleDelete(node as Memory);
    };

    showMemoryNode(
      {
        ...memory,
        level: 0, // Set a default level since it's required
      },
      deleteAdapter
    );
  };

  const MemoryNode: React.FC<{
    memory: Memory;
    depth?: number;
    index?: number;
    parentPath?: string;
  }> = ({ memory, depth = 0, index = 0, parentPath = "" }) => {
    const nodePath = parentPath ? `${parentPath}-${index}` : `${index}`;
    const isExpanded = expandedNodes.has(nodePath);

    return (
      <div
        className={`memory-node ${isExpanded ? "memory-node-expanded" : ""}`}
      >
        <div
          className="memory-node-header"
          onClick={() => toggleExpanded(nodePath)}
        >
          {depth > 0 && <div className="memory-node-connector" />}

          <div className="memory-node-info">
            <div className="memory-node-time">
              {formatDateTime(memory.timestamp)}
            </div>
            <div className="memory-node-actions">
              <button
                className="memory-view-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewMemory(memory);
                }}
              >
                View
              </button>
              <button
                className="memory-delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(memory);
                }}
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        </div>

        <div className="memory-node-content">
          <div>
            <strong>Prompt:</strong>
            <MarkdownRenderer content={memory.prompt} />
          </div>
          <div>
            <strong>Response:</strong>
            <MarkdownRenderer content={memory.response} />
          </div>
          {!isExpanded && <div className="memory-node-fade" />}
        </div>

        {isExpanded && memory.children && memory.children.length > 0 && (
          <div style={{ marginTop: "12px", marginLeft: "12px" }}>
            {memory.children.map((child, childIndex) => (
              <MemoryNode
                key={`${nodePath}-${childIndex}`}
                memory={child}
                depth={depth + 1}
                index={childIndex}
                parentPath={nodePath}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="memory-table">
      {memories.map((memory, index) => (
        <MemoryNode key={index} memory={memory} index={index} />
      ))}
    </div>
  );
};

export default function MemoryNetworkModal() {
  const [network, setNetwork] = useState<Network | null>(null);
  const [activeTab, setActiveTab] = useState<"network" | "table">("network");
  const { memories, loading, deleteMemory } = useMemoryNetwork();
  const { confirmMemoryDeletion } = useMemoryDeletion();
  const { showMemoryNode } = useMemoryNodeViewer();

  // Handle deleting a node
  const handleNodeDelete = async (node: any) => {
    if (!node) return;

    try {
      // Get the document ID for deletion (using only id now)
      let memoryId = "";
      if (typeof node.id === "string" && node.id) {
        memoryId = node.id;
      }

      console.log("Deleting memory with ID:", memoryId, "Node data:", {
        id: node.id,
        nodeId: node.nodeId,
      });

      if (!memoryId) {
        console.error("Cannot delete node: No valid ID found");
        toast.error("Cannot delete: No valid ID found");
        return;
      }

      // Confirm and delete the memory using the original document ID
      confirmMemoryDeletion(memoryId, {
        isMessage: false,
        onSuccess: (docID: string) => {
          // Update local state to remove the memory
          deleteMemory(memoryId);
          // Update the network visualization if possible
          if (network) {
            try {
              // Rebuild network immediately with updated memories
              if (
                activeTab === "network" &&
                Array.isArray(memories) &&
                memories.length > 0
              ) {
                buildNetwork(memories);
              }
            } catch (error) {
              console.error("Error refreshing network after deletion:", error);
            }
          }
        },
      });
    } catch (error) {
      console.error("Error deleting memory node:", error);
      toast.error("Failed to delete memory");
    }
  };

  // Handle tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as "network" | "table");
  };

  useEffect(() => {
    // Initialize the network when memories change or when activeTab changes to network
    if (
      activeTab === "network" &&
      Array.isArray(memories) &&
      memories.length > 0 &&
      !loading
    ) {
      // Small timeout to ensure the container is ready after tab switch
      const timer = setTimeout(() => {
        try {
          buildNetwork(memories);
        } catch (error) {
          console.error("Error initializing network:", error);
          toast.error("Failed to initialize memory network");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [memories, activeTab, loading]);

  const buildNetwork = (nodesData: Memory[]) => {
    // Create a container for the network
    const container = document.getElementById("memory-network-container");
    if (!container) return;

    // Clear previous network
    container.innerHTML = "";

    try {
      // Create datasets with explicit types
      const nodes = new DataSet<Node>([]);
      const edges = new DataSet<Edge>([]);

      // Check if we have valid memory data
      if (!nodesData || nodesData.length === 0) {
        console.warn("No memory data available for network visualization");
        return;
      }

      // Add the nodes and edges to the datasets
      const addMemoryNodes = (
        memory: Memory,
        parentNodeId: string | null = null,
        depth = 0,
        parentPath = ""
      ) => {
        if (!memory) return null;
        // We now only use the ID directly since originalId is being removed
        const documentId = memory.id;
        // Use a consistent node ID pattern for the visualization
        const nodeId = parentPath ? `${parentPath}-${depth}` : `root-${depth}`;

        // Color palette for different depths (based on old code)
        const colors = [
          "#FF5733", // Root (orange-red)
          "#3498DB", // Level 1 (blue)
          "#2ECC71", // Level 2 (green)
          "#9B59B6", // Level 3 (purple)
          "#F1C40F", // Level 4 (yellow)
          "#E74C3C", // Level 5 (red)
          "#1ABC9C", // Level 6 (turquoise)
          "#D35400", // Level 7 (dark orange)
          "#8E44AD", // Level 8 (dark purple)
          "#27AE60", // Level 9 (dark green)
        ];

        // Get color based on depth, cycling through colors if depth exceeds array length
        const nodeColor =
          depth === 0 ? colors[0] : colors[(depth % (colors.length - 1)) + 1];

        try {
          // Add the node with simplified properties
          nodes.add({
            id: nodeId,
            label: `${memory.prompt?.substring(0, 30) || ""}${
              (memory.prompt?.length || 0) > 30 ? "..." : ""
            }`,
            color: nodeColor,
            level: depth,
            shape: "dot",
            size: Math.max(30 - depth * 3, 15),
          });

          // Store the memory data separately with only the ID
          const memoryData = {
            // Use the document ID as the only identifier
            id: documentId,
            prompt: memory.prompt || "",
            response: memory.response || "",
            timestamp: memory.timestamp || Date.now(),
            level: depth,
            // Store additional information for debugging
            nodeId: nodeId,
          };

          // Add edge if this is not the root node
          if (parentNodeId) {
            edges.add({
              id: `${parentNodeId}-${nodeId}`,
              from: parentNodeId,
              to: nodeId,
              arrows: { to: { enabled: true } },
              width: Math.max(3 - depth * 0.5, 1),
              color: { color: nodeColor, opacity: 0.8 },
              smooth: { enabled: true, type: "continuous", roundness: 0.5 },
            });
          }

          // Process child nodes
          if (memory.children && memory.children.length > 0) {
            memory.children.forEach((child, index) => {
              if (child) {
                addMemoryNodes(
                  child,
                  nodeId,
                  depth + 1,
                  parentPath
                    ? `${parentPath}-${depth}-${index}`
                    : `root-${depth}-${index}`
                );
                // No need to do anything with the return value now as we're storing directly in memoryMap
              }
            });
          }

          // Return just the nodeId and directly store memoryData in the memoryMap
          memoryMap.set(nodeId, memoryData);
          return nodeId;
        } catch (error) {
          console.error("Error adding node to network:", error);
          return null;
        }
      };

      // A map to store the memory data separate from the vis-network nodes
      const memoryMap = new Map<string, any>();

      // Create the network with proper typing and simplified options
      const options = {
        nodes: {
          shape: "dot",
          font: { color: "#ffffff", size: 14 },
          borderWidth: 2,
          shadow: false,
        },
        edges: {
          color: { opacity: 0.3 },
          width: 2,
          smooth: {
            enabled: true,
            type: "continuous",
            roundness: 0.5,
          },
          arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        },
        interaction: {
          hover: false, // Disable hover completely to prevent errors
          dragNodes: true,
          dragView: true,
          zoomView: true,
          tooltipDelay: 2000, // Increase delay to reduce hover errors
          multiselect: false,
          selectable: true,
          selectConnectedEdges: false,
          hoverConnectedEdges: false, // Disable hover on edges
          navigationButtons: false, // Disable navigation buttons
        },
        physics: {
          enabled: true,
          solver: "barnesHut", // Use simpler solver
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.1,
            springLength: 150,
            springConstant: 0.04,
            damping: 0.09,
          },
          stabilization: {
            enabled: true,
            iterations: 200, // Reduce iterations for faster stabilization
            updateInterval: 50,
          },
        },
      };

      // Create a network instance within try-catch
      const networkInstance = new Network(container, { nodes, edges }, options);

      // Store the network instance
      setNetwork(networkInstance);

      // Handle clicking on nodes by looking up the data in our memory map
      networkInstance.on("click", (params) => {
        // Make sure we have nodes parameter and it's an array with values
        if (
          !params.nodes ||
          !Array.isArray(params.nodes) ||
          params.nodes.length === 0
        ) {
          return;
        }

        try {
          const nodeId = params.nodes[0].toString();
          if (nodeId) {
            // Get the memory data from our map, which contains the original document ID
            const nodeDataFromMap = memoryMap.get(nodeId) || {};
            const nodeDataFromVis = nodes.get(nodeId) || {};

            // Get the document ID from the memory map
            const documentId = nodeDataFromMap.id;

            // Ensure we prioritize the document ID for operations
            const combinedData = {
              ...nodeDataFromVis,
              ...nodeDataFromMap,
              // Explicitly set ID field
              id: documentId,
            };

            console.log("Selected node:", {
              nodeId,
              id: documentId,
              combinedNodeData: combinedData,
              nodeDataFromMap,
              prompt: combinedData.prompt,
              response: combinedData.response,
              timestamp: combinedData.timestamp,
            });

            // Use showMemoryNode instead of setSelectedNode
            showMemoryNode(combinedData, handleNodeDelete);
          }
        } catch (error) {
          console.error("Error handling node click:", error);
        }
      });

      // Add event listener for stabilized event
      networkInstance.once("stabilized", () => {
        try {
          networkInstance.fit();
        } catch (error) {
          console.error("Error fitting network view:", error);
        }
      });
    } catch (error) {
      console.error("Error building memory network:", error);
      toast.error("Failed to build memory network visualization");
    }
  };

  return (
    <>
      <Modal
        id="memoryNetwork"
        title="Memory Network"
        tabs={[
          {
            id: "network",
            label: "Network View",
            content: (
              <div className="memory-network-graph active">
                {loading ? (
                  <div className="memory-network-loading">
                    Loading memories...
                  </div>
                ) : (
                  <div
                    id="memory-network-container"
                    style={{ width: "100%", height: "100%" }}
                  ></div>
                )}
              </div>
            ),
            customClass: "",
          },
          {
            id: "table",
            label: "Table View",
            content: (
              <div className="memory-network-table active">
                {loading ? (
                  <div className="memory-network-loading">
                    Loading memories...
                  </div>
                ) : (
                  <TableView memories={memories} />
                )}
              </div>
            ),
            customClass: "",
          },
        ]}
        defaultTabId="network"
        onTabChange={handleTabChange}
      />
    </>
  );
}
