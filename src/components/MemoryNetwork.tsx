import { useEffect, useRef, useCallback, useState } from "react"
import { toast } from "sonner"
import { DataSet } from "vis-data"
import Modal from "./ui/modals/Modal"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { Memory } from "@/api/getMemories"
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion"
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer"
import { Network, Node, Edge } from "vis-network"
import "./MemoryNetwork.css"

// Global cache of node positions to preserve layout across modal instances
const persistedNodePositions: Record<string, { x: number; y: number }> = {}

export default function MemoryNetworkModal() {
  // State and refs
  const nodesDatasetRef = useRef<DataSet<Node> | null>(null)
  const edgesDatasetRef = useRef<DataSet<Edge> | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const networkRef = useRef<Network | null>(null)
  const { memories, loading, deleteMemory } = useMemoryNetwork()
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { showMemoryNode } = useMemoryNodeViewer()
  const [isOpeningNode, setIsOpeningNode] = useState(false)

  // Keep memoryMap in a ref so it persists even when component re-renders
  const memoryMapRef = useRef<Map<string, any>>(new Map())
  // For easy access in the JSX (access the current value)
  const memoryMap = memoryMapRef.current
  // Track if network needs to be refreshed
  const networkNeedsUpdate = useRef<boolean>(false)
  // State to avoid showing graph until it's fit
  const [isReady, setIsReady] = useState(false)

  // Function to reliably fit all nodes
  const fitAllNodes = useCallback(() => {
    if (networkRef.current && nodesDatasetRef.current) {
      try {
        // Simple fit with animation
        networkRef.current.fit({
          nodes: nodesDatasetRef.current.getIds(),
          animation: true
        });
        
        // Apply an additional slight zoom out for better visibility
        setTimeout(() => {
          if (networkRef.current) {
            const currentScale = networkRef.current.getScale();
            networkRef.current.moveTo({
              scale: Math.max(0.3, currentScale * 0.85),
              animation: true
            });
          }
        }, 600);
      } catch (e) {
        console.error("Error fitting nodes:", e);
      }
    }
  }, []);

  // Handle deleting a node - use useCallback to prevent recreation on each render
  const handleNodeDelete = useCallback(
    async (node: any) => {
      if (!node) return

      try {
        // Get the document ID for deletion (using only id now)
        let memoryId = ""
        if (typeof node.id === "string" && node.id) {
          memoryId = node.id
        }

        console.log("Deleting memory with ID:", memoryId, "Node data:", {
          id: node.id,
          nodeId: node.nodeId,
        })

        if (!memoryId) {
          console.error("Cannot delete node: No valid ID found")
          toast.error("Cannot delete: No valid ID found")
          return
        }

        // Confirm and delete the memory using the original document ID
        confirmMemoryDeletion(memoryId, {
          isMessage: false,
          onSuccess: () => {
            // Update local state to remove the memory
            deleteMemory(memoryId)
            // Mark that network needs update on next render
            networkNeedsUpdate.current = true
          },
        })
      } catch (error) {
        console.error("Error deleting memory node:", error)
        toast.error("Failed to delete memory")
      }
    },
    [confirmMemoryDeletion, deleteMemory]
  )

  // Enhanced memory node click handler to avoid unnecessary re-renders
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const data = memoryMapRef.current.get(nodeId)
      if (data) {
        // Set opening node flag before showing the memory
        setIsOpeningNode(true)
        // Persist positions before opening node
        if (networkRef.current && nodesDatasetRef.current) {
          networkRef.current.storePositions()
          nodesDatasetRef.current
            .get({ fields: ["id", "x", "y"] })
            .forEach((node) => {
              if (node.x != null && node.y != null) {
                persistedNodePositions[node.id.toString()] = {
                  x: node.x,
                  y: node.y,
                }
              }
            })
        }
        showMemoryNode(data, handleNodeDelete)
        // Reset the flag after a short delay
        setTimeout(() => setIsOpeningNode(false), 500)
      }
    },
    [showMemoryNode, handleNodeDelete]
  )

  // Build datasets
  useEffect(() => {
    // Skip rebuilding network if we're just opening a node
    if (isOpeningNode) {
      return;
    }
    
    try {
      const nodes = new DataSet<Node>([])
      const edges = new DataSet<Edge>([])

      // Only process if we have memory data
      if (Array.isArray(memories) && memories.length > 0 && !loading) {
        // Clear the memory map before rebuilding
        memoryMap.clear()

        console.log("Building network from memories:", memories.length)

        // Add the nodes and edges to the datasets
        const addMemoryNodes = (
          memory: Memory,
          parentNodeId: string | null = null,
          depth = 0,
          parentPath = ""
        ) => {
          if (!memory) return null
          // Use a consistent node ID pattern for the visualization
          const nodeId = parentPath ? `${parentPath}-${depth}` : `root-${depth}`

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
          ]

          // Get color based on depth, cycling through colors if depth exceeds array length
          const nodeColor =
            depth === 0 ? colors[0] : colors[(depth % (colors.length - 1)) + 1]

          try {
            // Make label more readable
            const label = memory.prompt
              ? memory.prompt.substring(0, 30) +
                (memory.prompt.length > 30 ? "..." : "")
              : "No prompt"

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
            })

            // Store the complete memory data with added properties
            const memoryWithLevel = {
              ...memory,
              level: depth,
              nodeId: nodeId,
            }

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
              })
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
                  )
                }
              })
            }

            // Store the memory with level info in the memoryMap
            memoryMap.set(nodeId, memoryWithLevel)
            return nodeId
          } catch (error) {
            console.error("Error adding node to network:", error)
            return null
          }
        }

        // Process all root memories
        memories.forEach((memory, index) => {
          addMemoryNodes(memory, null, 0, `root-${index}`)
        })

        // Log the node and edge counts for debugging
        console.log(`Created ${nodes.length} nodes and ${edges.length} edges`)
        console.log(`Memory map contains ${memoryMap.size} entries`)

        // Store the datasets in refs
        // Keep only positions for nodes present in this dataset
        const existingIds = new Set(nodes.get().map((n) => n.id.toString()))
        Object.keys(persistedNodePositions).forEach((id) => {
          if (!existingIds.has(id)) {
            delete persistedNodePositions[id]
          }
        })
        // Hydrate positions for remaining nodes
        Object.entries(persistedNodePositions).forEach(([id, pos]) => {
          try {
            nodes.update({ id, x: pos.x, y: pos.y })
          } catch {
            // ignore missing nodes
          }
        })
        nodesDatasetRef.current = nodes
        edgesDatasetRef.current = edges
      }
    } catch (error) {
      console.error("Error building memory network data:", error)
      nodesDatasetRef.current = null
      edgesDatasetRef.current = null
    }
  }, [memories, loading, memoryMap, isOpeningNode])

  // Create network once when component mounts
  useEffect(() => {
    const netContainer = containerRef.current
    if (!netContainer || !nodesDatasetRef.current || !edgesDatasetRef.current) {
      return
    }
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
        hover: false,
        dragNodes: true,
        dragView: true,
        zoomView: true,
        tooltipDelay: 2000,
        multiselect: false,
        selectable: true,
        selectConnectedEdges: false,
        hoverConnectedEdges: false,
        navigationButtons: false,
      },
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
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
          iterations: 100,
          updateInterval: 50,
          onlyDynamicEdges: true,
        },
      },
    }
    const net = new Network(
      netContainer,
      { nodes: nodesDatasetRef.current, edges: edgesDatasetRef.current },
      options
    )
    networkRef.current = net
    
    // Fit view after stabilization
    net.once("stabilized", () => {
      setIsReady(true)
      // Add a slight delay to ensure DOM is fully updated
      setTimeout(() => {
        fitAllNodes();
      }, 100);
      
      // Store and cache node positions for next initialization
      net.storePositions()
      if (nodesDatasetRef.current) {
        nodesDatasetRef.current.get().forEach((node) => {
          if (node.x != null && node.y != null) {
            persistedNodePositions[node.id.toString()] = {
              x: node.x,
              y: node.y,
            }
          }
        })
      }
    })
    
    // Click handler
    net.on("click", (params) => {
      if (!params.nodes || params.nodes.length === 0) return
      const nodeId = params.nodes[0].toString()
      handleNodeClick(nodeId)
    })
    
    // Handle resize
    const onResize = () => {
      if (!netContainer) return
      const w = netContainer.clientWidth
      const h = netContainer.clientHeight
      if (w > 0 && h > 0) {
        net.setSize(w.toString(), h.toString())
        // Refit when resizing
        if (isReady) {
          setTimeout(() => fitAllNodes(), 200);
        }
      }
    }
    window.addEventListener("resize", onResize)
    
    // Create a ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (isReady && networkRef.current) {
        // Only refit if the network is already stable
        setTimeout(() => fitAllNodes(), 200);
      }
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Cleanup
    return () => {
      net.destroy()
      window.removeEventListener("resize", onResize)
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    }
  }, [handleNodeDelete, showMemoryNode, handleNodeClick, fitAllNodes, isReady])
  
  // Attempt to refit when ready changes
  useEffect(() => {
    if (isReady && memories.length > 0) {
      setTimeout(() => fitAllNodes(), 200);
    }
  }, [isReady, memories.length, fitAllNodes]);

  // Render tabs as before
  return (
    <Modal id="memoryNetwork" title="Memory Network">
      <div
        ref={containerRef}
        id="memory-network-container"
        className="w-full h-full min-h-[500px] flex flex-col"
        style={{ visibility: isReady ? "visible" : "hidden" }}
      />
      {!isReady && !isOpeningNode && memories.length > 0 && (
        <div className="loading-indicator">Building network...</div>
      )}
    </Modal>
  )
}
