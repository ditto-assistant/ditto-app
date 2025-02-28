import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
          // We now only use the ID directly since originalId is being removed
          const documentId = memory.id;
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
    console.log("Network effect running", {
      activeTab,
      networkNeedsUpdate: networkNeedsUpdate.current,
      networkData,
      networkIsStabilizing: networkIsStabilizing.current,
    });

    // Skip if the network tab isn't active or we don't have network data
    if (activeTab !== "network" || !networkData) {
      return;
    }

    // Skip network recreation unless it's needed or if stabilization is in progress
    if (
      !networkNeedsUpdate.current &&
      network &&
      !networkIsStabilizing.current
    ) {
      return;
    }

    // If we're already stabilizing, don't rebuild the network
    if (networkIsStabilizing.current) {
      return;
    }

    // Get or create the container
    const container = document.getElementById("memory-network-container");
    if (!container) {
      console.error("Container not found for memory network");
      return;
    }

    // Ensure the container has proper dimensions before initializing
    if (!container.clientWidth || !container.clientHeight) {
      container.style.width = "100%";
      container.style.height = "600px"; // Ensure a minimum height
    }

    // Set up just once per render cycle
    networkNeedsUpdate.current = false;

    // Add a small delay to ensure the DOM is ready and container is rendered
    const timer = setTimeout(() => {
      try {
        // If we already have a network instance, destroy it to prevent memory leaks
        if (network) {
          network.destroy();
        }

        // Create a new network instance with the memoized data
        if (networkData) {
          const { nodes, edges, options } = networkData;

          // Modify physics options for better initial rendering
          const networkOptions = {
            ...options,
            physics: {
              ...options.physics,
              stabilization: {
                enabled: true,
                iterations: 200, // Reduced iterations to prevent long stabilization
                updateInterval: 50,
                fit: true,
              },
            },
          };

          // Create container size checker (sometimes container isn't fully rendered yet)
          if (container.clientWidth < 50 || container.clientHeight < 50) {
            container.style.width = "100%";
            container.style.height = "600px";
            // Force a reflow
            container.getBoundingClientRect();
          }

          const networkInstance = new Network(
            container,
            { nodes, edges },
            networkOptions
          );

          // Set the stabilizing flag before stabilization starts
          networkIsStabilizing.current = true;

          // Save the network instance
          setNetwork(networkInstance);
          networkInitializedRef.current = true;

          // Create an instance of the node click handler that won't recreate on every render
          const handleNodeClick = (params: { nodes?: string[] | number[] }) => {
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
                // Get data from the nodes dataset instead of the network instance
                const nodeDataFromVis = networkData.nodes.get(nodeId) || {};

                // Get the document ID from the memory map
                const documentId = nodeDataFromMap.id;

                // Ensure we prioritize the document ID for operations
                const combinedData = {
                  ...nodeDataFromVis,
                  ...nodeDataFromMap,
                  // Explicitly set ID field
                  id: documentId,
                };

                // Use showMemoryNode instead of setSelectedNode
                showMemoryNode(combinedData, handleNodeDelete);
              }
            } catch (error) {
              console.error("Error handling node click:", error);
            }
          };

          networkInstance.on("click", handleNodeClick);

          // Add event listener for stabilized event and make sure the network is visible
          networkInstance.once("stabilized", () => {
            try {
              // Reset the stabilizing flag to allow future updates when needed
              networkIsStabilizing.current = false;

              // Fit the view, but don't cause any state updates that would trigger render
              networkInstance.fit({
                animation: {
                  duration: 500,
                  easingFunction: "easeInOutQuad",
                },
              });
            } catch (error) {
              console.error("Error fitting network view:", error);
              // Make sure we reset the flag even if there's an error
              networkIsStabilizing.current = false;
            }
          });
        }
      } catch (error) {
        console.error("Error initializing memory network:", error);
        toast.error("Failed to initialize memory network visualization");
        // Reset the flags in case of error
        networkIsStabilizing.current = false;
        networkNeedsUpdate.current = false;
      }
    }, 300); // Small delay to ensure container is ready

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, networkData]); // Only depend on activeTab and networkData

  // Only mark network for update when memories actually change
  useEffect(() => {
    if (memories && activeTab === "network") {
      networkNeedsUpdate.current = true;
    }
  }, [memories, activeTab]);

  // Listen for tab changes to trigger rendering when switching to network tab
  useEffect(() => {
    if (activeTab === "network") {
      networkNeedsUpdate.current = true;
    }
  }, [activeTab]);

  // Cleanly destroy the network when unmounting
  useEffect(() => {
    return () => {
      if (network) {
        network.destroy();
      }
    };
  });

  return (
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
                  style={{
                    width: "100%",
                    height: "600px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                  ref={containerRef}
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
  );
}
