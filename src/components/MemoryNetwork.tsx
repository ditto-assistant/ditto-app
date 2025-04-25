import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { toast } from "sonner"
import { DataSet } from "vis-data"
import Modal from "./ui/modals/Modal"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { Memory } from "@/api/getMemories"
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion"
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer"
import { Network, Node, Edge } from "vis-network"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import "./MemoryNetwork.css"
import TableView from "./memory-network/TableView"

export default function MemoryNetworkModal() {
  // Using useState for network to trigger renders when it changes
  const [network, setNetwork] = useState<Network | null>(null)
  const [activeTab, setActiveTab] = useState<"network" | "table">("network")
  const { memories, loading, deleteMemory } = useMemoryNetwork()
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { showMemoryNode } = useMemoryNodeViewer()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const networkInitializedRef = useRef<boolean>(false)
  const networkNeedsUpdate = useRef<boolean>(true)
  const networkIsStabilizing = useRef<boolean>(false)
  const networkRef = useRef<Network | null>(null) // Store network in ref to persist between renders
  const nodesDatasetRef = useRef<DataSet<Node> | null>(null)
  const edgesDatasetRef = useRef<DataSet<Edge> | null>(null)

  // Keep memoryMap in a ref so it persists even when component re-renders
  const memoryMapRef = useRef<Map<string, any>>(new Map())
  // For easy access in the JSX (access the current value)
  const memoryMap = memoryMapRef.current

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

  // Handle tab changes
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as "network" | "table")
  }, [])

  // We have refactored the building logic into the useEffect directly
  // This is no longer needed with our new approach

  // This is no longer needed with our new approach
  // We build the datasets directly in the first useEffect

  // Create network datasets without attaching to DOM
  useEffect(() => {
    // Force rebuild when memories change or when explicitly requested
    if (
      !networkNeedsUpdate.current &&
      nodesDatasetRef.current &&
      edgesDatasetRef.current
    ) {
      console.log("Using existing datasets")
      return
    }

    // Reset the update flag
    networkNeedsUpdate.current = false

    // When memories change, rebuild the network data
    try {
      // Create datasets with explicit types
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
      }

      // Store the datasets in refs
      nodesDatasetRef.current = nodes
      edgesDatasetRef.current = edges
    } catch (error) {
      console.error("Error building memory network data:", error)
      nodesDatasetRef.current = null
      edgesDatasetRef.current = null
    }
  }, [memories, loading, memoryMap])

  // Create and attach network when tab is active
  useEffect(() => {
    // Only attempt to create/update network when the network tab is active and container is available
    if (activeTab !== "network") {
      return // Not on network tab, do nothing
    }

    // Get the container
    const container = containerRef.current
    if (!container) {
      console.error("Container ref not set for memory network")
      return
    }

    // Make sure we have datasets
    if (!nodesDatasetRef.current || !edgesDatasetRef.current) {
      console.error("Network datasets not available")
      return
    }

    // Create options
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
    }

    // Check if we already have a network
    if (networkRef.current) {
      console.log("Network already exists, updating container and redrawing")

      try {
        // Get current size
        const width = container.clientWidth
        const height = container.clientHeight

        // Force network to redraw at the right size
        networkRef.current.setSize(width.toString(), height.toString())
        networkRef.current.redraw()

        // Fit to view
        setTimeout(() => {
          if (networkRef.current) {
            networkRef.current.fit()
          }
        }, 100)

        return // Exit early as we've updated existing network
      } catch (error) {
        console.error("Error updating existing network:", error)
        // Fall through to recreation
      }
    }

    // We need to create a new network
    console.log("Creating new network instance")

    try {
      // Clean up old network if it exists (belt and suspenders)
      if (networkRef.current) {
        networkRef.current.destroy()
      }

      // Create new network
      const networkInstance = new Network(
        container,
        {
          nodes: nodesDatasetRef.current,
          edges: edgesDatasetRef.current,
        },
        options
      )

      // Store in both ref (for persistence) and state (for triggering renders)
      networkRef.current = networkInstance
      setNetwork(networkInstance)

      // Mark as initialized
      networkInitializedRef.current = true
      networkIsStabilizing.current = true

      // Set up node click handler
      networkInstance.on("click", (params: { nodes?: string[] | number[] }) => {
        if (
          !params.nodes ||
          !Array.isArray(params.nodes) ||
          params.nodes.length === 0
        ) {
          return
        }

        try {
          const nodeId = params.nodes[0].toString()
          if (nodeId) {
            const nodeData = memoryMap.get(nodeId)
            if (nodeData) {
              showMemoryNode(nodeData, handleNodeDelete)
            }
          }
        } catch (error) {
          console.error("Error handling node click:", error)
        }
      })

      // Handle stabilization completion
      networkInstance.once("stabilized", () => {
        console.log("Network stabilized, fitting to view")
        networkIsStabilizing.current = false
        networkInstance.fit()
      })

      // Add handler for resize events
      window.addEventListener("resize", () => {
        if (networkRef.current && containerRef.current) {
          const width = containerRef.current.clientWidth
          const height = containerRef.current.clientHeight
          networkRef.current.setSize(width.toString(), height.toString())
          networkRef.current.redraw()
        }
      })
    } catch (error) {
      console.error("Error initializing memory network:", error)
      toast.error("Failed to initialize memory network visualization")
      networkIsStabilizing.current = false
      networkNeedsUpdate.current = false
      networkInitializedRef.current = false
      networkRef.current = null
    }
  }, [activeTab, handleNodeDelete, showMemoryNode, memoryMap])

  // Remove the old effect for handling tab changes since we have a better approach now

  // Monitor DOM visibility of the container when network tab is active
  useEffect(() => {
    if (activeTab !== "network" || !networkRef.current) {
      return
    }

    // Create a MutationObserver to watch for visibility changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "style" ||
            mutation.attributeName === "class")
        ) {
          // The container's visibility might have changed
          console.log("Container attributes changed, checking visibility")

          // Get the container
          const container = containerRef.current
          if (!container) return

          // Container is visible, make sure network is correctly sized
          const width = container.clientWidth
          const height = container.clientHeight

          // If dimensions are valid, trigger redraw
          if (width > 0 && height > 0 && networkRef.current) {
            console.log(`Resizing network to ${width}x${height}`)
            try {
              networkRef.current.setSize(width.toString(), height.toString())
              networkRef.current.redraw()

              // Fit view with a small delay to ensure rendering completes
              setTimeout(() => {
                if (networkRef.current) {
                  networkRef.current.fit()
                }
              }, 50)
            } catch (error) {
              console.error(
                "Error updating network on visibility change:",
                error
              )
            }
          }
        }
      }
    })

    // Get the container
    const container = containerRef.current
    if (container) {
      // Start observing
      observer.observe(container, {
        attributes: true,
        attributeFilter: ["style", "class"],
      })

      // Force an immediate size update
      if (networkRef.current) {
        const width = container.clientWidth
        const height = container.clientHeight
        if (width > 0 && height > 0) {
          console.log(`Initial sizing network to ${width}x${height}`)
          try {
            networkRef.current.setSize(width.toString(), height.toString())
            networkRef.current.redraw()
            networkRef.current.fit()
          } catch (error) {
            console.error("Error with initial network sizing:", error)
          }
        }
      }
    }

    // Clean up observer
    return () => observer.disconnect()
  }, [activeTab])

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
          })
        }, 100)
      } catch (err) {
        console.error("Error fitting network:", err)
      }
    }
  }, [network, activeTab, networkIsStabilizing])

  // Ensure proper cleanup on unmount
  useEffect(() => {
    return () => {
      // Use networkRef for cleanup since it's our source of truth
      if (networkRef.current) {
        console.log("Cleaning up network on component unmount")
        try {
          networkRef.current.destroy()
          networkRef.current = null
          setNetwork(null)
        } catch (err) {
          console.error("Error destroying network:", err)
        }
      }

      // Clear window resize listener
      window.removeEventListener("resize", () => {
        console.log("Removed resize listener")
      })
    }
  }, [])

  // Render network view content
  const NetworkView = (
    <div className="w-full h-full min-h-[500px] flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading memories...
        </div>
      ) : (
        <div
          className="w-full h-[calc(100vh-160px)] min-h-[400px] border border-border/10 bg-background/10 relative overflow-hidden"
          ref={containerRef}
          id="memory-network-container" // Add ID to help with debugging
        ></div>
      )}
    </div>
  )

  // Render table view content
  const TableViewContent = (
    <div className="w-full h-full min-h-[500px] flex flex-col relative">
      {loading ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading memories...
        </div>
      ) : (
        <div className="relative overflow-y-auto overflow-x-hidden pb-10 pt-2 h-full">
          <TableView memories={memories} />
        </div>
      )}
    </div>
  )

  return (
    <Modal
      id="memoryNetwork"
      title="Memory Network"
      tabs={[
        {
          id: "network",
          label: "Network View",
          content: NetworkView,
        },
        {
          id: "table",
          label: "Table View",
          content: TableViewContent,
        },
      ]}
      defaultTabId="network"
      onTabChange={handleTabChange}
    />
  )
}
