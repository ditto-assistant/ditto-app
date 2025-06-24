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

// Define the new prop for root node configuration
interface RootNodeConfig {
  id: string
  label: string
  title?: string
  color?: string
  isQueryNode?: boolean // True for dashboard search, false/undefined for specific message root
  originalMemory?: Memory // The actual memory object if the root is a specific memory
}

interface MemoriesNetworkGraphProps {
  memories: Memory[] // These are children/related memories to the root node
  rootNodeConfig: RootNodeConfig // New prop for root node
  // onNodeClick is handled by showMemoryNode from the hook context, no need to pass as prop if using the hook directly
}

const MemoriesNetworkGraph: React.FC<MemoriesNetworkGraphProps> = ({
  memories,
  rootNodeConfig,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const networkRef = useRef<VisNetwork | null>(null)
  const nodesDatasetRef = useRef<DataSet<Node> | null>(null)
  const edgesDatasetRef = useRef<DataSet<Edge> | null>(null)
  const memoryMapRef = useRef<
    Map<
      string,
      Memory | { isQueryNode: boolean; query?: string; originalMemory?: Memory }
    >
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

    if (
      networkRef.current &&
      nodesDatasetRef.current &&
      nodesDatasetRef.current.length > 0
    ) {
      try {
        isFittingRef.current = true

        const fitOptions: FitOptions = {
          nodes: nodesDatasetRef.current.getIds(),
          animation: {
            duration: 500,
            easingFunction: "easeOutQuad",
          },
        }
        networkRef.current.fit(fitOptions)

        // Simpler handling after fit, let user control zoom more directly on mobile after initial fit.
        fitTimeoutRef.current = setTimeout(() => {
          isFittingRef.current = false
          fitTimeoutRef.current = null
        }, 550) // Corresponds to desktop animation time, should be enough for mobile too
      } catch (e) {
        console.error("Error fitting nodes:", e)
        isFittingRef.current = false
      }
    }
  }, [])

  // Enhanced memory node click handler to avoid unnecessary re-renders
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const clickedItem = memoryMapRef.current.get(nodeId)
      if (
        clickedItem &&
        !(clickedItem as RootNodeConfig).isQueryNode &&
        !(clickedItem as any).query
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
        // If the root was an original memory, pass it for context if needed by showMemoryNode or its consumers
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
    // const preventTouch = (e: TouchEvent) => { // Removing this for now, let vis-network handle touch
    //   if (e.touches.length > 1) {
    //     e.preventDefault()
    //   }
    // }

    const nodes = new DataSet<Node>()
    const edges = new DataSet<Edge>()
    memoryMapRef.current.clear()

    if (!isOpeningNode) {
      setIsReady(false)
    }

    // Add the root node using rootNodeConfig
    nodes.add({
      id: rootNodeConfig.id,
      label:
        rootNodeConfig.label.substring(0, 30) +
        (rootNodeConfig.label.length > 30 ? "..." : ""),
      title: rootNodeConfig.title || rootNodeConfig.label,
      color: {
        background: rootNodeConfig.isQueryNode ? "#FF6B6B" : "#9966ff",
        border: "#ffffff",
        highlight: {
          background: "#ffffff",
          border: "#ffffff"
        }
      },
      level: 0,
      shape: "dot",
      size: 35,
      borderWidth: 3,
      shadow: {
        enabled: true,
        color: rootNodeConfig.isQueryNode ? "rgba(255, 107, 107, 0.8)" : "rgba(153, 102, 255, 0.8)",
        size: 15,
        x: 0,
        y: 0
      },
      x: persistedNodePositions[rootNodeConfig.id]?.x,
      y: persistedNodePositions[rootNodeConfig.id]?.y,
    })
    // Store root node information in memoryMap
    if (rootNodeConfig.isQueryNode) {
      memoryMapRef.current.set(rootNodeConfig.id, {
        isQueryNode: true,
        query: rootNodeConfig.label,
      })
    } else if (rootNodeConfig.originalMemory) {
      memoryMapRef.current.set(rootNodeConfig.id, rootNodeConfig.originalMemory)
    }

    const addMemoryRecursive = (
      memory: Memory,
      parentNodeId: string,
      depth: number,
      path: string
    ) => {
      const nodeId = `${path}-${memory.id}`
      if (memoryMapRef.current.has(nodeId)) return

      // Neural network color scheme with category-based colors
      const categoryColors = [
        { bg: "#4ECDC4", glow: "rgba(78, 205, 196, 0.8)", name: "technical" }, // Technical Skills - Teal
        { bg: "#96CEB4", glow: "rgba(150, 206, 180, 0.8)", name: "learning" }, // Learning Context - Green
        { bg: "#45B7D1", glow: "rgba(69, 183, 209, 0.8)", name: "creative" }, // Creative Ideas - Blue
        { bg: "#FFEAA7", glow: "rgba(255, 234, 167, 0.8)", name: "conversations" }, // Conversations - Yellow
        { bg: "#FF6B6B", glow: "rgba(255, 107, 107, 0.8)", name: "personal" }, // Personal Knowledge - Red
      ]
      
      const colorIndex = depth % categoryColors.length
      const nodeColor = categoryColors[colorIndex]
      
      const label = memory.prompt
        ? memory.prompt.substring(0, 20) +
          (memory.prompt.length > 20 ? "..." : "")
        : "Memory"
      // Assuming vector_distance is similarity where higher is better (0 to 1 scale)
      const scorePercentage = (memory.vector_distance * 100).toFixed(1)

      nodes.add({
        id: nodeId,
        label: label,
        title: `Prompt: ${memory.prompt}\nMatch: ${scorePercentage}%`,
        color: {
          background: nodeColor.bg,
          border: "#ffffff",
          highlight: {
            background: "#ffffff",
            border: "#ffffff"
          }
        },
        level: depth + 1,
        shape: "dot",
        size: Math.max(30 - depth * 2, 20),
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: nodeColor.glow,
          size: 12,
          x: 0,
          y: 0
        },
        font: {
          color: "#CCD6F6",
          size: 12,
          face: "Arial"
        },
        x: persistedNodePositions[nodeId]?.x,
        y: persistedNodePositions[nodeId]?.y,
      })
      memoryMapRef.current.set(nodeId, memory)

      if (parentNodeId) {
        edges.add({
          from: parentNodeId,
          to: nodeId,
          arrows: { to: { enabled: true, scaleFactor: 0.5 } },
          length: 70 + depth * 25,
          color: {
            color: nodeColor.bg,
            opacity: 0.6,
            highlight: nodeColor.bg,
            hover: nodeColor.bg
          },
          width: 2,
          smooth: { enabled: true, type: "dynamic", roundness: 0.5 }
        })
      }

      if (memory.children && memory.children.length > 0) {
        memory.children.forEach((child) => {
          addMemoryRecursive(child, nodeId, depth + 1, `${path}-${memory.id}`)
        })
      }
    }

    // Connect provided memories to the root node
    memories.forEach((rootMemory, index) => {
      addMemoryRecursive(rootMemory, rootNodeConfig.id, 0, `root${index}`)
    })

    nodesDatasetRef.current = nodes
    edgesDatasetRef.current = edges

          if (container) {
        // Ensure container has the gradient background
        container.style.background = `
          radial-gradient(circle at 20% 30%, rgba(153, 102, 255, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(255, 110, 178, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(255, 173, 102, 0.04) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(153, 102, 255, 0.05) 0%, rgba(255, 110, 178, 0.03) 30%, rgba(10, 25, 47, 1) 70%),
          linear-gradient(135deg, #0A192F 0%, #112240 50%, #1E293B 100%)
        `
        
        const options: Options = {
          configure: {
            enabled: false
          },
          autoResize: true,
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
          zoomView: true, // Enable zoom for all devices
          dragView: true, // Enable drag for all devices
          multiselect: false,
          selectable: true,
          selectConnectedEdges: false,
        },
        nodes: {
          borderWidth: 3,
          font: { color: "#CCD6F6", size: 12, face: "Arial" },
          shadow: {
            enabled: true,
            color: "rgba(0, 0, 0, 0.5)",
            size: 10,
            x: 2,
            y: 2
          }
        },
        edges: {
          smooth: { enabled: true, type: "dynamic", roundness: 0.5 },
          color: {
            color: "#9966ff",
            highlight: "#ffffff",
            hover: "#ffffff",
            inherit: false,
            opacity: 0.5,
          },
          width: 1.5,
          dashes: [3, 3],
          shadow: {
            enabled: true,
            color: "rgba(153, 102, 255, 0.3)",
            size: 5,
            x: 0,
            y: 0
          }
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
          
          // Ensure canvas background is transparent
          const forceTransparentBackground = () => {
            const canvas = container.querySelector('canvas')
            if (canvas) {
              canvas.style.background = 'transparent'
              canvas.style.backgroundColor = 'transparent'
              canvas.style.backgroundImage = 'none'
            }
            
            // Also target any other background elements
            const visContainer = container.querySelector('.vis-network')
            if (visContainer) {
              (visContainer as HTMLElement).style.background = 'transparent'
              ;(visContainer as HTMLElement).style.backgroundColor = 'transparent'
            }
          }
          
          forceTransparentBackground()
          
          // Ensure transparency is maintained after stabilization
          setTimeout(forceTransparentBackground, 100)
          setTimeout(forceTransparentBackground, 500)

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

      if (networkRef.current && (memories.length > 0 || nodes.length > 1)) {
        networkRef.current.stabilize(200)
      }

      // Disable touch gestures on mobile for the container
      // if (isMobile && container) { // Removing this for now
      //   container.style.touchAction = "none"
      //   // Add event listeners to prevent default touch behavior
      //   container.addEventListener("touchstart", preventTouch, {
      //     passive: false,
      //   })
      //   container.addEventListener("touchmove", preventTouch, {
      //     passive: false,
      //   })

      //   return () => {
      //     // Clean up event listeners
      //     if (container) {
      //       container.removeEventListener("touchstart", preventTouch)
      //       container.removeEventListener("touchmove", preventTouch)
      //     }

      //     // Cleanup resize observer
      //     if (container) {
      //       resizeObserver.unobserve(container)
      //     }
      //     resizeObserver.disconnect()

      //     // Store positions before unmounting
      //     if (networkRef.current && nodesDatasetRef.current) {
      //       networkRef.current.storePositions()
      //       nodesDatasetRef.current
      //         .get({ fields: ["id", "x", "y"] })
      //         .forEach((node) => {
      //           if (node.x != null && node.y != null) {
      //             persistedNodePositions[node.id as string] = {
      //               x: node.x,
      //               y: node.y,
      //             }
      //           }
      //         })
      //     }
      //   }
      // } else {
      // For desktop, ensure resize observer is cleaned up (this else branch becomes the main return for cleanup)
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
      // } // End of removed if/else for mobile touch handling
    }
  }, [
    memories,
    rootNodeConfig,
    handleNodeClick,
    isReady,
    isOpeningNode,
    fitAllNodes,
    isMobile,
    theme,
  ])

  // Attempt to refit when ready changes
  useEffect(() => {
    if (
      isReady &&
      (memories.length > 0 ||
        (nodesDatasetRef.current && nodesDatasetRef.current.length > 1)) &&
      !isFittingRef.current
    ) {
      // Only refit if not already fitting
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current)
      }
      fitTimeoutRef.current = setTimeout(() => fitAllNodes(), 200)
    }
  }, [isReady, memories.length, fitAllNodes, nodesDatasetRef.current?.length])

  // Create floating particles effect
  useEffect(() => {
    const particlesContainer = document.getElementById('particles')
    if (!particlesContainer) return

    // Clear existing particles
    particlesContainer.innerHTML = ''

    // Create 20 floating particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.left = Math.random() * 100 + '%'
      particle.style.top = Math.random() * 100 + '%'
      particle.style.animationDelay = Math.random() * 6 + 's'
      particle.style.animationDuration = (6 + Math.random() * 4) + 's'
      particlesContainer.appendChild(particle)
    }

    return () => {
      if (particlesContainer) {
        particlesContainer.innerHTML = ''
      }
    }
  }, [isReady])

  // Show placeholder or loading only if memories are being fetched or network is building
  if (
    memories.length === 0 &&
    !rootNodeConfig.isQueryNode &&
    nodesDatasetRef.current &&
    nodesDatasetRef.current.length <= 1 &&
    !isReady
  ) {
    // If it's not a query node (i.e. specific message) and no children, maybe show a specific message or just the node.
    // For now, let it try to render just the root node if memories array is empty.
  }

  if (
    memories.length === 0 &&
    rootNodeConfig.isQueryNode &&
    !isReady &&
    containerRef.current?.parentElement?.style.display !== "none"
  ) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-ditto-secondary text-lg text-center gap-3">
        <Info size={24} />
        <p>Search to visualize your memory network.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-[300px] relative p-6">
      {/* Network Container with Border */}
      <div 
        className="flex-1 relative network-visualizer-wrapper"
        style={{
          border: '2px solid rgba(153, 102, 255, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(153, 102, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          overflow: 'hidden',
          background: `
            radial-gradient(circle at 20% 30%, rgba(153, 102, 255, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 110, 178, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 173, 102, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(153, 102, 255, 0.05) 0%, rgba(255, 110, 178, 0.03) 30%, rgba(10, 25, 47, 1) 70%),
            linear-gradient(135deg, #0A192F 0%, #112240 50%, #1E293B 100%)
          `
        }}
      >
        {/* Neural Network Background Layer */}
        <div className="neural-network-background">
          <div className="particles" id="particles"></div>
          <div className="bg-element" style={{top: '20%', left: '10%', width: '80px', height: '80px'}}></div>
          <div className="bg-element" style={{top: '60%', right: '15%', width: '40px', height: '40px'}}></div>
          <div className="bg-element" style={{top: '80%', left: '5%', width: '60px', height: '60px'}}></div>
        </div>
        
        {/* Vis-Network Container */}
        <div
          ref={containerRef}
          id="memory-network-container"
          className="absolute inset-0 w-full h-full"
          style={{ visibility: isReady ? "visible" : "hidden", background: 'transparent' }}
        />
        
        {/* Network Overlay */}
        <div className="network-overlay"></div>
        
        {!isReady &&
          nodesDatasetRef.current &&
          nodesDatasetRef.current.length > 0 &&
          !isOpeningNode && (
            <div className="absolute inset-0 flex items-center justify-center text-ditto-secondary text-lg z-10">
              <div className="glass-interactive px-6 py-3 rounded-lg">
                Building network...
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

export default MemoriesNetworkGraph
