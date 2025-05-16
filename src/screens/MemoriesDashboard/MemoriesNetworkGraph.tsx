import React, { useState, useEffect, useRef, useCallback } from "react"
import { Info } from "lucide-react"
import { Memory } from "@/api/getMemories"
import { usePlatform } from "@/hooks/usePlatform"
import { useTheme } from "@/components/theme-provider"
import {
  useMemoryNodeViewer,
  MemoryWithLevel,
} from "@/hooks/useMemoryNodeViewer"
import { DataSet } from "vis-data"
import {
  Network as VisNetwork,
  Node,
  Edge,
  Options,
  FitOptions,
} from "vis-network"

// Global cache of node positions to preserve layout across modal instances
// This was originally in MemoriesDashboardOverlay.tsx
const persistedNodePositions: Record<string, { x: number; y: number }> = {}

interface MemoriesNetworkGraphProps {
  memories: Memory[]
  searchQuery: string
}

const MemoriesNetworkGraph: React.FC<MemoriesNetworkGraphProps> = ({
  memories,
  searchQuery,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const networkRef = useRef<VisNetwork | null>(null)
  const nodesDatasetRef = useRef<DataSet<Node> | null>(null)
  const edgesDatasetRef = useRef<DataSet<Edge> | null>(null)
  const memoryMapRef = useRef<
    Map<string, Memory | { isQueryNode: boolean; query: string }>
  >(new Map())
  const { showMemoryNode } = useMemoryNodeViewer()
  const [isReady, setIsReady] = useState(false)
  const [isOpeningNode, setIsOpeningNode] = useState(false)
  const { isMobile } = usePlatform()
  const { theme } = useTheme()

  // Refs to track fit operations
  const isFittingRef = useRef<boolean>(false)
  const fitTimeoutRef = useRef<number | null>(null)

  // Function to reliably fit all nodes
  const fitAllNodes = useCallback(() => {
    // Don't run multiple fit operations simultaneously
    if (isFittingRef.current) return

    // Clear any pending fit operations
    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current)
      fitTimeoutRef.current = null
    }

    if (networkRef.current && nodesDatasetRef.current) {
      try {
        isFittingRef.current = true

        // Simple fit with animation - different behavior for mobile vs desktop
        const fitOptions: FitOptions = {
          nodes: nodesDatasetRef.current.getIds(),
          animation: {
            duration: 500,
            easingFunction: "easeOutQuad",
          },
        }

        networkRef.current.fit(fitOptions)

        // Only apply additional zoom-out on mobile
        // On desktop we keep the default fit behavior
        if (isMobile) {
          fitTimeoutRef.current = setTimeout(() => {
            if (networkRef.current) {
              const currentScale = networkRef.current.getScale()
              networkRef.current.moveTo({
                scale: Math.max(0.3, currentScale * 0.85),
                animation: {
                  duration: 300,
                  easingFunction: "easeOutQuad",
                },
              })
            }
            isFittingRef.current = false
            fitTimeoutRef.current = null
          }, 600)
        } else {
          // On desktop, just mark fitting as complete after animation
          fitTimeoutRef.current = setTimeout(() => {
            isFittingRef.current = false
            fitTimeoutRef.current = null
          }, 550)
        }
      } catch (e) {
        console.error("Error fitting nodes:", e)
        isFittingRef.current = false
      }
    }
  }, [isMobile])

  // Enhanced memory node click handler to avoid unnecessary re-renders
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const clickedItem = memoryMapRef.current.get(nodeId)
      if (
        clickedItem &&
        !("isQueryNode" in clickedItem && clickedItem.isQueryNode)
      ) {
        const clickedMemory = clickedItem as Memory
        // Set opening node flag before showing the memory
        setIsOpeningNode(true)
        // Persist positions before opening node
        if (networkRef.current && nodesDatasetRef.current) {
          networkRef.current.storePositions()
          nodesDatasetRef.current
            .get({ fields: ["id", "x", "y"] })
            .forEach((node) => {
              if (node.x != null && node.y != null) {
                persistedNodePositions[node.id as string] = {
                  x: node.x,
                  y: node.y,
                }
              }
            })
        }
        showMemoryNode(clickedMemory as MemoryWithLevel)
        // Reset the flag after a short delay
        setTimeout(() => setIsOpeningNode(false), 500)
      }
    },
    [showMemoryNode]
  )

  useEffect(() => {
    // Skip rebuilding the network if we're just opening a node
    if (isOpeningNode) {
      return
    }

    // Determine effective theme for vis-network options
    let effectiveTheme = theme
    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }

    const nodeFontColor = effectiveTheme === "dark" ? "#FFFFFF" : "#333333"
    // const edgeColor = effectiveTheme === "dark" ? "#555555" : "#a0a0a0"; // Example if we need dynamic edges

    const container = containerRef.current
    // Define the prevent touch handler at the top level of the effect
    // so it's available in the cleanup function
    const preventTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    const nodes = new DataSet<Node>()
    const edges = new DataSet<Edge>()
    memoryMapRef.current.clear()

    if (!isOpeningNode) {
      setIsReady(false)
    }

    const queryNodeId = "search-query-node"
    nodes.add({
      id: queryNodeId,
      label:
        searchQuery.substring(0, 30) + (searchQuery.length > 30 ? "..." : ""),
      title: `Your search: ${searchQuery}`,
      color: "#ED4245", // Distinct color for the query node
      level: 0, // Central node
      shape: "dot", // Changed from ellipse to dot
      size: 30,
      x: persistedNodePositions[queryNodeId]?.x,
      y: persistedNodePositions[queryNodeId]?.y,
    })
    memoryMapRef.current.set(queryNodeId, {
      isQueryNode: true,
      query: searchQuery,
    })

    const addMemoryRecursive = (
      memory: Memory,
      parentNodeId: string | null,
      depth: number,
      path: string
    ) => {
      const nodeId = `${path}-${memory.id}`
      if (memoryMapRef.current.has(nodeId)) return

      const colors = ["#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E74C3C"] // Start colors from depth 1
      const nodeColor = colors[depth % colors.length]

      const label = memory.prompt
        ? memory.prompt.substring(0, 20) +
          (memory.prompt.length > 20 ? "..." : "")
        : "Memory"
      const scorePercentage = ((1 - memory.vector_distance) * 100).toFixed(1)

      nodes.add({
        id: nodeId,
        label: label,
        title: `Prompt: ${memory.prompt}\nSimilarity: ${scorePercentage}%`,
        color: nodeColor,
        level: depth + 1, // Offset level because query node is level 0
        shape: "dot",
        size: Math.max(25 - depth * 3, 10),
        x: persistedNodePositions[nodeId]?.x,
        y: persistedNodePositions[nodeId]?.y,
      })
      memoryMapRef.current.set(nodeId, memory)

      if (parentNodeId) {
        edges.add({
          from: parentNodeId,
          to: nodeId,
          arrows: { to: { enabled: true, scaleFactor: 0.5 } },
          length: 70 + depth * 25, // Adjusted length
        })
      }

      if (memory.children && memory.children.length > 0) {
        memory.children.forEach((child) => {
          // Path ensures unique IDs even if child IDs are not globally unique across different trees
          addMemoryRecursive(child, nodeId, depth + 1, `${path}-${memory.id}`)
        })
      }
    }

    memories.forEach((rootMemory, index) => {
      // Each root memory connects to the central query node
      addMemoryRecursive(rootMemory, queryNodeId, 0, `root${index}`)
    })

    nodesDatasetRef.current = nodes
    edgesDatasetRef.current = edges

    if (container) {
      const options: Options = {
        layout: {
          hierarchical: false,
        },
        physics: {
          enabled: true,
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -60,
            centralGravity: 0.01,
            springLength: 120,
            springConstant: 0.08,
            damping: 0.5,
            avoidOverlap: 0.9,
          },
          stabilization: {
            enabled: true,
            iterations: 200,
            fit: true,
            updateInterval: 50,
            onlyDynamicEdges: false,
          },
        },
        interaction: {
          dragNodes: true,
          menuMobile: true,
          tooltipDelay: 200,
          hover: true,
          zoomView: !isMobile,
          dragView: !isMobile,
          multiselect: false,
          selectable: true,
          selectConnectedEdges: false,
        },
        nodes: {
          borderWidth: 2,
          font: { color: nodeFontColor, size: 12, face: "Arial" },
        },
        edges: {
          smooth: { enabled: true, type: "dynamic", roundness: 0.5 },
          color: {
            color: "#a0a0a0",
            highlight: "#66afe9",
            hover: "#66afe9",
            inherit: "from",
            opacity: 0.7,
          },
        },
      }

      if (networkRef.current) {
        networkRef.current.setData({ nodes, edges })
        networkRef.current.setOptions(options)
      } else {
        networkRef.current = new VisNetwork(
          container,
          { nodes, edges },
          options
        )

        networkRef.current.on("click", (params) => {
          if (params.nodes.length > 0) {
            const clickedNodeId = params.nodes[0] as string
            handleNodeClick(clickedNodeId)
          }
        })
      }

      // Fit the network properly when stabilized
      networkRef.current.once("stabilizationIterationsDone", () => {
        setIsReady(true)
        // Slight delay to ensure DOM is fully updated
        setTimeout(() => {
          fitAllNodes()
        }, 100)

        if (networkRef.current && nodesDatasetRef.current) {
          networkRef.current.storePositions()
          nodesDatasetRef.current
            .get({ fields: ["id", "x", "y"] })
            .forEach((node) => {
              if (node.x != null && node.y != null) {
                persistedNodePositions[node.id as string] = {
                  x: node.x,
                  y: node.y,
                }
              }
            })
        }
      })

      // Handle resizing to ensure proper fit
      const resizeObserver = new ResizeObserver(() => {
        if (isReady && networkRef.current && !isFittingRef.current) {
          // Only refit if the network is already stable and not already fitting
          if (fitTimeoutRef.current) {
            clearTimeout(fitTimeoutRef.current)
          }
          fitTimeoutRef.current = setTimeout(() => fitAllNodes(), 200)
        }
      })

      if (container) {
        resizeObserver.observe(container)
      }

      if (networkRef.current && memories.length > 0) {
        networkRef.current.stabilize(200)
      }

      // Disable touch gestures on mobile for the container
      if (isMobile && container) {
        container.style.touchAction = "none"
        // Add event listeners to prevent default touch behavior
        container.addEventListener("touchstart", preventTouch, {
          passive: false,
        })
        container.addEventListener("touchmove", preventTouch, {
          passive: false,
        })

        return () => {
          // Clean up event listeners
          if (container) {
            container.removeEventListener("touchstart", preventTouch)
            container.removeEventListener("touchmove", preventTouch)
          }

          // Cleanup resize observer
          if (container) {
            resizeObserver.unobserve(container)
          }
          resizeObserver.disconnect()

          // Store positions before unmounting
          if (networkRef.current && nodesDatasetRef.current) {
            networkRef.current.storePositions()
            nodesDatasetRef.current
              .get({ fields: ["id", "x", "y"] })
              .forEach((node) => {
                if (node.x != null && node.y != null) {
                  persistedNodePositions[node.id as string] = {
                    x: node.x,
                    y: node.y,
                  }
                }
              })
          }
        }
      } else {
        // For desktop, ensure resize observer is cleaned up
        return () => {
          if (container) {
            resizeObserver.unobserve(container)
          }
          resizeObserver.disconnect()

          // Store positions before unmounting
          if (networkRef.current && nodesDatasetRef.current) {
            networkRef.current.storePositions()
            nodesDatasetRef.current
              .get({ fields: ["id", "x", "y"] })
              .forEach((node) => {
                if (node.x != null && node.y != null) {
                  persistedNodePositions[node.id as string] = {
                    x: node.x,
                    y: node.y,
                  }
                }
              })
          }
        }
      }
    }
  }, [
    memories,
    searchQuery,
    handleNodeClick,
    isReady,
    isOpeningNode,
    fitAllNodes,
    isMobile,
    theme,
  ])

  // Attempt to refit when ready changes
  useEffect(() => {
    if (isReady && memories.length > 0 && !isFittingRef.current) {
      // Only refit if not already fitting
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current)
      }
      fitTimeoutRef.current = setTimeout(() => fitAllNodes(), 200)
    }
  }, [isReady, memories.length, fitAllNodes])

  // Show placeholder or loading only if memories are being fetched or network is building
  if (
    memories.length === 0 &&
    !isReady &&
    containerRef.current?.parentElement?.style.display !== "none"
  ) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-muted-foreground text-lg text-center gap-3">
        <Info size={24} />
        <p>Search to visualize your memory network.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-[300px] relative">
      <div
        ref={containerRef}
        className="flex-1 relative w-full rounded-lg bg-muted border border-border overflow-hidden"
        style={{ visibility: isReady ? "visible" : "hidden" }}
      />
      {!isReady && memories.length > 0 && !isOpeningNode && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-lg bg-background/80 z-10">
          Building network...
        </div>
      )}
    </div>
  )
}

export default MemoriesNetworkGraph
