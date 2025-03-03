import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { FaTrash, FaEye } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { DataSet } from "vis-data";
import ChatMessage from "./ChatMessage";
import Modal from "./ui/modals/Modal";
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion";
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork";
import { Memory } from "@/api/getMemories";
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer";
import { Network, Node, Edge } from "vis-network";
import "./MemoryNetwork.css";

const formatDateTime = (timestamp: Date | number) => {
  if (!timestamp) return "";
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
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

  // Get the total count of items including children
  const getMemoryTreeCount = (memory: Memory): number => {
    let count = 1; // Count self
    if (memory.children && memory.children.length > 0) {
      memory.children.forEach((child) => {
        count += getMemoryTreeCount(child);
      });
    }
    return count;
  };

  const MemoryNode: React.FC<{
    memory: Memory;
    depth?: number;
    index?: number;
    parentPath?: string;
  }> = ({ memory, depth = 0, index = 0, parentPath = "" }) => {
    const nodePath = parentPath ? `${parentPath}-${index}` : `${index}`;
    const isExpanded = expandedNodes.has(nodePath);
    const hasChildren = memory.children && memory.children.length > 0;
    const childrenCount = hasChildren ? getMemoryTreeCount(memory) - 1 : 0;

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
              <span
                className={`memory-node-expand-icon ${hasChildren ? "has-children" : ""}`}
              >
                {hasChildren ? (isExpanded ? "▼" : "▶") : "○"}
              </span>
              {formatDateTime(memory.timestamp)}
              {hasChildren && (
                <span className="memory-children-count">
                  ({childrenCount} {childrenCount === 1 ? "child" : "children"})
                </span>
              )}
            </div>
            <div className="memory-node-actions">
              <button
                className="memory-view-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewMemory(memory);
                }}
                title="View memory details"
              >
                <FaEye /> View
              </button>
              <button
                className="memory-delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(memory);
                }}
                title="Delete this memory"
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        </div>

        <div
          className={`memory-node-content ${isExpanded ? "expanded" : "collapsed"}`}
        >
          <div className="memory-node-messages">
            <ChatMessage
              content={memory.prompt}
              timestamp={
                memory.timestamp instanceof Date
                  ? memory.timestamp.getTime()
                  : Date.now()
              }
              isUser={true}
              bubbleStyles={{
                text: { fontSize: 14 },
                chatbubble: { borderRadius: 8, padding: 8 },
              }}
            />
            <ChatMessage
              content={memory.response}
              timestamp={
                memory.timestamp instanceof Date
                  ? memory.timestamp.getTime()
                  : Date.now()
              }
              isUser={false}
              bubbleStyles={{
                text: { fontSize: 14 },
                chatbubble: { borderRadius: 8, padding: 8 },
              }}
            />
          </div>
          {!isExpanded && <div className="memory-node-fade" />}
        </div>

        {isExpanded && hasChildren && (
          <div className="memory-children-container">
            {memory.children?.map((child, childIndex) => (
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
      {memories.length === 0 ? (
        <div className="memory-empty-state">
          No memories found. Chat with Ditto to create memories.
        </div>
      ) : (
        memories.map((memory, index) => (
          <MemoryNode key={index} memory={memory} index={index} />
        ))
      )}
    </div>
  );
};

export default function MemoryNetworkModal() {
  const [network, setNetwork] = useState<Network | null>(null);
  const [activeTab, setActiveTab] = useState<"network" | "table">("network");
  const { memories, loading, deleteMemory } = useMemoryNetwork();
  const { confirmMemoryDeletion } = useMemoryDeletion();
  const { showMemoryNode } = useMemoryNodeViewer();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkInitializedRef = useRef<boolean>(false);
  const networkNeedsUpdate = useRef<boolean>(true);
  const networkIsStabilizing = useRef<boolean>(false);
  const memoryMap = useMemo(() => new Map<string, any>(), []);

  // Handle deleting a node - use useCallback to prevent recreation on each render
  const handleNodeDelete = useCallback(
    async (node: any) => {
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
          onSuccess: () => {
            // Update local state to remove the memory
            deleteMemory(memoryId);
            // Mark that network needs update on next render
            networkNeedsUpdate.current = true;
          },
        });
      } catch (error) {
        console.error("Error deleting memory node:", error);
        toast.error("Failed to delete memory");
      }
    },
    [confirmMemoryDeletion, deleteMemory]
  );

  // Handle tab changes
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as "network" | "table");
  }, []);

  // Memoize the buildNetwork function so it only creates a new network
  // when memories actually change, not just when switching tabs
  const buildNetwork = useMemo(() => {
    return (nodesData: Memory[]) => {
      // Only proceed if we have memory data
      if (!nodesData || nodesData.length === 0) {
        console.warn("No memory data available for network visualization");
        return null;
      }

      try {
        // Create datasets with explicit types
        const nodes = new DataSet<Node>([]);
        const edges = new DataSet<Edge>([]);

        // Clear the memory map before rebuilding
        memoryMap.clear();

        console.log("Building network from memories:", nodesData);

        // Add the nodes and edges to the datasets
        const addMemoryNodes = (
          memory: Memory,
          parentNodeId: string | null = null,
          depth = 0,
          parentPath = ""
        ) => {
          if (!memory) return null;
          // Use a consistent node ID pattern for the visualization
          const nodeId = parentPath
            ? `${parentPath}-${depth}`
            : `root-${depth}`;

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
            // Make label more readable
            const label = memory.prompt
              ? memory.prompt.substring(0, 30) +
                (memory.prompt.length > 30 ? "..." : "")
              : "No prompt";

            // Add the node with simplified properties
            nodes.add({
              id: nodeId,
              label: label,
              color: nodeColor,
              level: depth,
              shape: "dot",
              size: Math.max(30 - depth * 3, 15),
              font: {
                color: "#FFFFFF",
                size: 14,
                face: "Arial",
              },
            });

            // Store the complete memory data with added properties
            const memoryWithLevel = {
              ...memory,
              level: depth,
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

            // Return just the nodeId and directly store the memory with level info in the memoryMap
            memoryMap.set(nodeId, memoryWithLevel);
            return nodeId;
          } catch (error) {
            console.error("Error adding node to network:", error);
            return null;
          }
        };

        // Create the network options object
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
            solver: "forceAtlas2Based", // Use different solver that works better for tree structures
            forceAtlas2Based: {
              gravitationalConstant: -50,
              centralGravity: 0.01,
              springLength: 100,
              springConstant: 0.08,
              damping: 0.4,
              avoidOverlap: 0.8,
            },
            stabilization: {
              enabled: true,
              iterations: 100, // Reduce iterations for faster stabilization
              updateInterval: 50,
            },
          },
        };

        // Process all root memories
        nodesData.forEach((memory, index) => {
          addMemoryNodes(memory, null, 0, `root-${index}`);
        });

        // Log the node and edge counts for debugging
        console.log(`Created ${nodes.length} nodes and ${edges.length} edges`);

        // Verify memory map contains entries
        console.log(`Memory map contains ${memoryMap.size} entries`);

        // Return the data for creating a network
        return { nodes, edges, options };
      } catch (error) {
        console.error("Error building memory network:", error);
        toast.error("Failed to build memory network visualization");
        return null;
      }
    };
  }, [memoryMap]); // Only depends on memoryMap, which is itself memoized

  // Memoize the network data based on memories
  const networkData = useMemo(() => {
    if (Array.isArray(memories) && memories.length > 0 && !loading) {
      return buildNetwork(memories);
    }
    return null;
  }, [memories, loading, buildNetwork]);

  // Initialize or update the network when necessary
  useEffect(() => {
    // Only attempt to create/update network when the network tab is active and we have data
    if (activeTab !== "network" || !networkData) {
      return;
    }

    // Skip if already have a network and don't need update
    if (
      !networkNeedsUpdate.current &&
      network &&
      !networkIsStabilizing.current
    ) {
      return;
    }

    // Skip if already stabilizing
    if (networkIsStabilizing.current) {
      return;
    }

    // Get the container
    const container = document.getElementById("memory-network-container");
    if (!container) {
      console.error("Container not found for memory network");
      return;
    }

    // Reset the update flag
    networkNeedsUpdate.current = false;

    // Add a small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      try {
        // Clean up old network if it exists
        if (network) {
          network.destroy();
        }

        // Create a new network with the data
        if (networkData) {
          const { nodes, edges, options } = networkData;

          // Set stabilization options
          const networkOptions = {
            ...options,
            physics: {
              ...options.physics,
              stabilization: {
                enabled: true,
                iterations: 100,
                updateInterval: 50,
                fit: true,
              },
            },
          };

          // Create the network
          const networkInstance = new Network(
            container,
            { nodes, edges },
            networkOptions
          );

          // Set stabilizing flag
          networkIsStabilizing.current = true;

          // Save the network
          setNetwork(networkInstance);
          networkInitializedRef.current = true;

          // Set up node click handler
          networkInstance.on(
            "click",
            (params: { nodes?: string[] | number[] }) => {
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
                  const nodeData = memoryMap.get(nodeId);
                  if (nodeData) {
                    showMemoryNode(nodeData, handleNodeDelete);
                  }
                }
              } catch (error) {
                console.error("Error handling node click:", error);
              }
            }
          );

          // Handle stabilization completion
          networkInstance.once("stabilized", () => {
            networkIsStabilizing.current = false;
            networkInstance.fit();
          });
        }
      } catch (error) {
        console.error("Error initializing memory network:", error);
        toast.error("Failed to initialize memory network visualization");
        networkIsStabilizing.current = false;
        networkNeedsUpdate.current = false;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    activeTab,
    networkData,
    network,
    handleNodeDelete,
    showMemoryNode,
    memoryMap,
  ]);

  // Fit the network when it's visible and active
  useEffect(() => {
    // Only execute this effect when on network tab with an existing network
    if (activeTab === "network" && network && !networkIsStabilizing.current) {
      try {
        // Use a small timeout to ensure the container is properly sized in the DOM
        setTimeout(() => {
          network.fit({
            animation: {
              duration: 300,
              easingFunction: "easeInOutQuad",
            },
          });
        }, 100);
      } catch (err) {
        console.error("Error fitting network:", err);
      }
    }
  }, [network, activeTab, networkIsStabilizing]);

  // Create the network view component
  const NetworkView = useMemo(() => {
    console.log("Rendering NetworkView");
    return (
      <div className="memory-network-graph">
        {loading ? (
          <div className="memory-network-loading">Loading memories...</div>
        ) : (
          <div id="memory-network-container" ref={containerRef}></div>
        )}
      </div>
    );
  }, [loading, containerRef]);

  // Create the table view component
  const TableViewContent = useMemo(() => {
    console.log("Rendering TableViewContent");

    return (
      <div className="memory-network-table">
        {loading ? (
          <div className="memory-network-loading">Loading memories...</div>
        ) : (
          <div className="memory-table-scroll-container">
            <TableView memories={memories} />
          </div>
        )}
      </div>
    );
  }, [loading, memories]);

  return (
    <Modal
      id="memoryNetwork"
      title="Memory Network"
      fullScreen={true}
      tabs={[
        {
          id: "network",
          label: "Network View",
          content: null, // We'll render this via children
        },
        {
          id: "table",
          label: "Table View",
          content: TableViewContent, // Table view comes from the tab content
        },
      ]}
      defaultTabId="network"
      onTabChange={handleTabChange}
    >
      {/* Network view rendered conditionally as children */}
      <div
        className={`network-view-container ${activeTab === "network" ? "active" : "hidden"}`}
      >
        {NetworkView}
      </div>
    </Modal>
  );
}
