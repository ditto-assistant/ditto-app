import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Target,
  BarChart3,
  Brain,
  MessageCircle,
  X,
  Info,
  Maximize2,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import ChatMessage from "@/components/ChatMessage"
import { Memory } from "@/api/getMemories"
import { usePlatform } from "@/hooks/usePlatform"
import { useTheme } from "@/components/theme-provider"
import { MemoryWithLevel } from "@/hooks/useMemoryNodeViewer"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { DataSet } from "vis-data"
import {
  Network as VisNetwork,
  Node,
  Edge,
  Options,
  FitOptions,
} from "vis-network"

const persistedNodePositions: Record<string, { x: number; y: number }> = {}

interface RootNodeConfig {
  id: string
  label: string
  title?: string
  color?: string
  isQueryNode?: boolean
  originalMemory?: Memory
}

interface MemoriesNetworkGraphProps {
  memories: Memory[]
  rootNodeConfig: RootNodeConfig
}

const SUBJECT_NODE_COLOR = "#2ECC71"
const KEY_SUBJECT_COLOR = "#FFD700"
const SUBJECT_NODE_SIZE = 14
const MAX_SUBJECTS_PER_PAIR = 5

// Memory type detection
const getMemoryType = (memory: Memory): { icon: string; type: string } => {
  const prompt = memory.prompt?.toLowerCase() || ""
  if (prompt.includes("?")) return { icon: "❓", type: "question" }
  if (
    prompt.includes("create") ||
    prompt.includes("make") ||
    prompt.includes("generate")
  )
    return { icon: "🎨", type: "creative" }
  if (prompt.includes("remind") || prompt.includes("remember"))
    return { icon: "⏰", type: "reminder" }
  if (prompt.includes("analyze") || prompt.includes("think"))
    return { icon: "🧠", type: "analysis" }
  return { icon: "💭", type: "thought" }
}

// Memory depth calculation
const getMemoryDepth = (memory: Memory): number => {
  if (!memory.children || memory.children.length === 0) return 1
  return 1 + Math.max(...memory.children.map(getMemoryDepth))
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
  // Removed useMemoryNodeViewer - now using inline chat message view
  const { pairDetails } = useMemoryNetwork()
  const [isReady, setIsReady] = useState(false)
  // Removed isOpeningNode - no longer needed with inline chat view
  const [showStats, setShowStats] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [selectedNodeForModal, setSelectedNodeForModal] = useState<{
    memory: Memory | null
    position: { x: number; y: number }
  } | null>(null)
  const [selectedKeySubject, setSelectedKeySubject] = useState<{
    subject: any
    position: { x: number; y: number }
  } | null>(null)
  const [selectedNode, setSelectedNode] = useState<{
    nodeId: string
    memory: Memory
    x: number
    y: number
  } | null>(null)
  const [showChatMessage, setShowChatMessage] = useState<{
    memory: Memory
    position: { x: number; y: number }
  } | null>(null)
  const [isAnimatingBack, setIsAnimatingBack] = useState(false)
  const [previousNodeStats, setPreviousNodeStats] = useState<{
    memory: Memory | null
    position: { x: number; y: number }
  } | null>(null)
  const previousNodeStatsRef = useRef<{
    memory: Memory | null
    position: { x: number; y: number }
  } | null>(null)
  const { isMobile } = usePlatform()
  const { theme } = useTheme()

  // Cleanup animation state when modals are closed
  useEffect(() => {
    if (!showChatMessage && !selectedNodeForModal && !selectedKeySubject) {
      setIsAnimatingBack(false)
    }
  }, [showChatMessage, selectedNodeForModal, selectedKeySubject])

  const isFittingRef = useRef<boolean>(false)
  const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Simple network statistics to avoid re-render loops
  const totalMemories = memories.length + 1
  const totalSubjects = Object.values(pairDetails).reduce(
    (sum, pd) => sum + pd.subjects.length,
    0
  )
  const keySubjects = Object.values(pairDetails).reduce(
    (sum, pd) => sum + pd.subjects.filter((s) => s.is_key_subject).length,
    0
  )
  const networkStats = {
    totalMemories,
    totalSubjects,
    keySubjects,
    avgSubjectsPerMemory:
      totalMemories > 0 ? (totalSubjects / totalMemories).toFixed(1) : "0",
    memoryDepth:
      memories.length > 0
        ? Math.max(...memories.map((m) => getMemoryDepth(m)), 1)
        : 1,
  }

  const fitAllNodes = useCallback(() => {
    if (isFittingRef.current) return
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
          animation: { duration: 800, easingFunction: "easeOutCubic" },
        }
        networkRef.current.fit(fitOptions)
        fitTimeoutRef.current = setTimeout(() => {
          isFittingRef.current = false
          fitTimeoutRef.current = null
        }, 850)
      } catch (e) {
        console.error("Error fitting nodes:", e)
        isFittingRef.current = false
      }
    }
  }, [])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      console.log("Node clicked:", nodeId)

      // Check if this is a subject node (nodeId format: "shared-subject-subjectId")
      if (nodeId.startsWith("shared-subject-")) {
        console.log("Subject node detected:", nodeId)
        // Extract subject ID from the nodeId
        const subjectId = nodeId.replace("shared-subject-", "")
        console.log("Looking for subject ID:", subjectId)

        // Find the subject in pairDetails
        let foundSubject = null
        Object.entries(pairDetails).forEach(([pairId, details]) => {
          if (details && details.subjects) {
            const subject = details.subjects.find((s) => s.id === subjectId)
            if (subject) {
              console.log("Found subject:", subject)
              foundSubject = subject
            }
          }
        })

        if (foundSubject) {
          console.log("Setting selectedKeySubject with:", foundSubject)
          // Get node position for modal positioning
          if (networkRef.current) {
            const canvasPos = networkRef.current.getPositions([nodeId])[nodeId]
            if (canvasPos) {
              const domPos = networkRef.current.canvasToDOM(canvasPos)
              setSelectedKeySubject({
                subject: foundSubject,
                position: { x: domPos.x, y: domPos.y },
              })
            }
          }
        } else {
          console.log("Subject not found for ID:", subjectId)
        }
        return
      }

      // Handle memory node clicks (existing logic)
      console.log("Memory node detected:", nodeId)
      const clickedItem = memoryMapRef.current.get(nodeId)
      if (
        clickedItem &&
        !(clickedItem as RootNodeConfig).isQueryNode &&
        !("query" in clickedItem)
      ) {
        const clickedMemory = clickedItem as Memory

        // Get node position for modal positioning
        if (networkRef.current) {
          const canvasPos = networkRef.current.getPositions([nodeId])[nodeId]
          if (canvasPos) {
            const domPos = networkRef.current.canvasToDOM(canvasPos)
            setSelectedNodeForModal({
              memory: clickedMemory,
              position: { x: domPos.x, y: domPos.y },
            })
          }
        }
      }
    },
    [pairDetails]
  )

  useEffect(() => {
    let effectiveTheme = theme
    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }
    const nodeFontColor = effectiveTheme === "dark" ? "#FFFFFF" : "#333333"

    const container = containerRef.current
    const nodes = new DataSet<Node>()
    const edges = new DataSet<Edge>()
    memoryMapRef.current.clear()

    setIsReady(false)

    // Enhanced root node with neural styling
    const rootSize = 35 + Math.min(networkStats.totalSubjects * 2, 15)
    nodes.add({
      id: rootNodeConfig.id,
      label:
        rootNodeConfig.label.substring(0, 30) +
        (rootNodeConfig.label.length > 30 ? "..." : ""),
      title: `${rootNodeConfig.title || rootNodeConfig.label}\n\n🧠 Neural Activity:\n• ${networkStats.totalMemories} memories\n• ${networkStats.totalSubjects} subjects\n• ${networkStats.keySubjects} key subjects`,
      color: {
        background:
          rootNodeConfig.color ||
          (rootNodeConfig.isQueryNode ? "#ED4245" : "#3498DB"),
        border: "#ffffff",
        highlight: { background: "#7289da", border: "#ffffff" },
      },
      level: 0,
      shape: "dot",
      size: rootSize,
      font: { size: 14, color: nodeFontColor, face: "Inter, Arial" },
      x: persistedNodePositions[rootNodeConfig.id]?.x,
      y: persistedNodePositions[rootNodeConfig.id]?.y,
    })
    if (rootNodeConfig.originalMemory) {
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

      const colors = ["#3498DB", "#2ECC71", "#9B59B6", "#F1C40F", "#E74C3C"]
      const nodeColor = colors[depth % colors.length]
      const memoryType = getMemoryType(memory)

      const label = memory.prompt
        ? memory.prompt.substring(0, 20) +
          (memory.prompt.length > 20 ? "..." : "")
        : "Memory"

      // Enhanced node with depth-based sizing and opacity
      const nodeSize = Math.max(28 - depth * 4, 12)
      const opacity = Math.max(1 - depth * 0.15, 0.6)

      nodes.add({
        id: nodeId,
        label: `${memoryType.icon} ${label}`,
        title: `${memoryType.type.toUpperCase()}\n${memory.prompt ? `Prompt: ${memory.prompt}` : "Memory"}\n\nDepth: Level ${depth + 1}`,
        color: {
          background: nodeColor,
          border: "#ffffff",
          highlight: { background: "#7289da", border: "#ffffff" },
        },
        level: depth + 1,
        shape: "dot",
        size: nodeSize,
        font: {
          size: Math.max(11 - depth, 9),
          color: nodeFontColor,
          face: "Inter, Arial",
        },
        opacity: opacity,
        x: persistedNodePositions[nodeId]?.x,
        y: persistedNodePositions[nodeId]?.y,
      })
      memoryMapRef.current.set(nodeId, memory)

      if (parentNodeId) {
        // Dynamic edge thickness based on memory relevance
        const relevanceScore = memory.vector_distance || 0.5
        const edgeWidth = Math.max(1, Math.floor(relevanceScore * 4))

        edges.add({
          from: parentNodeId,
          to: nodeId,
          arrows: { to: { enabled: true, scaleFactor: 0.6 } },
          length: 80 + depth * 30,
          width: edgeWidth,
          color: {
            color: `rgba(160, 160, 160, ${opacity})`,
            highlight: "#66afe9",
            hover: "#66afe9",
          },
          smooth: { enabled: true, type: "dynamic", roundness: 0.3 },
        })
      }

      // Remove individual subject nodes creation from here
      // Subject consolidation will happen later

      if (memory.children && memory.children.length > 0) {
        memory.children.forEach((child) => {
          addMemoryRecursive(child, nodeId, depth + 1, `${path}-${memory.id}`)
        })
      }
    }

    memories.forEach((rootMemory, index) => {
      addMemoryRecursive(rootMemory, rootNodeConfig.id, 1, `child-${index}`)
    })

    // Consolidate subjects across all memory pairs
    const consolidatedSubjects = new Map<
      string,
      {
        subject: any
        connectedMemoryNodes: string[]
        totalConnections: number
      }
    >()

    // Collect all subjects and their connections
    Object.entries(pairDetails).forEach(([pairId, details]) => {
      if (details && details.subjects && details.subjects.length > 0) {
        details.subjects.forEach((subj) => {
          const subjectKey = subj.subject_text // Use subject_text as unique key

          if (consolidatedSubjects.has(subjectKey)) {
            const existing = consolidatedSubjects.get(subjectKey)!
            // Find the memory node for this pair
            const memoryNodeId = Array.from(memoryMapRef.current.keys()).find(
              (nodeId) => {
                const memory = memoryMapRef.current.get(nodeId)
                return memory && "id" in memory && memory.id === pairId
              }
            )
            if (
              memoryNodeId &&
              !existing.connectedMemoryNodes.includes(memoryNodeId)
            ) {
              existing.connectedMemoryNodes.push(memoryNodeId)
              existing.totalConnections++
            }
            // Keep the subject with higher pair_count
            if (subj.pair_count > existing.subject.pair_count) {
              existing.subject = subj
            }
          } else {
            // Find the memory node for this pair
            const memoryNodeId = Array.from(memoryMapRef.current.keys()).find(
              (nodeId) => {
                const memory = memoryMapRef.current.get(nodeId)
                return memory && "id" in memory && memory.id === pairId
              }
            )
            consolidatedSubjects.set(subjectKey, {
              subject: subj,
              connectedMemoryNodes: memoryNodeId ? [memoryNodeId] : [],
              totalConnections: 1,
            })
          }
        })
      }
    })

    // Create consolidated subject nodes
    const subjectEntries = Array.from(consolidatedSubjects.entries())
      .sort((a, b) => b[1].totalConnections - a[1].totalConnections) // Sort by total connections
      .slice(0, MAX_SUBJECTS_PER_PAIR * 3) // Allow more subjects for the whole network

    // Position subjects in a strategic layout around the network
    const networkBounds = {
      minX: -200,
      maxX: 200,
      minY: -200,
      maxY: 200,
    }

    subjectEntries.forEach(([subjectKey, data], idx) => {
      const subj = data.subject
      const connections = data.totalConnections

      // Calculate size based on total connections across the network
      const subjectSize = Math.min(
        SUBJECT_NODE_SIZE + Math.log(connections + 1) * 4, // Larger scaling for shared nodes
        35 // Increased max size for important subjects
      )

      const subjectColor = subj.is_key_subject
        ? KEY_SUBJECT_COLOR
        : SUBJECT_NODE_COLOR
      const subjectNodeId = `shared-subject-${subj.id}`

      // Strategic positioning: arrange in a loose grid around the network
      const gridCols = Math.ceil(Math.sqrt(subjectEntries.length))
      const gridRow = Math.floor(idx / gridCols)
      const gridCol = idx % gridCols

      const spacing = 120
      const offsetX = (gridCol - gridCols / 2) * spacing
      const offsetY =
        (gridRow - Math.ceil(subjectEntries.length / gridCols) / 2) * spacing

      // Add some randomization to avoid perfect grid
      const randomOffset = 30
      const finalX = offsetX + (Math.random() - 0.5) * randomOffset
      const finalY = offsetY + (Math.random() - 0.5) * randomOffset

      nodes.add({
        id: subjectNodeId,
        label: `${subj.subject_text.substring(0, 18)}${subj.subject_text.length > 18 ? "..." : ""}\n(${connections} ${connections === 1 ? "memory" : "memories"})`,
        title: `Subject: ${subj.subject_text}\nConnected to ${connections} memories across network\n${subj.is_key_subject ? "⭐ Key Subject" : "Regular Subject"}${subj.description ? `\n\n${subj.description}` : ""}`,
        color: {
          background: subjectColor,
          border: subj.is_key_subject ? "#FFD700" : "#2ECC71",
          highlight: { background: "#7289da", border: "#ffffff" },
        },
        level: 10, // High level to keep subjects on the periphery
        shape: "dot",
        size: subjectSize,
        font: {
          size: Math.min(10 + Math.log(connections), 14), // Dynamic font size
          color: "#ffffff",
          face: "Inter, Arial",
          multi: "md",
          strokeWidth: 1,
          strokeColor: "#000000",
        },
        x: finalX,
        y: finalY,
      })

      // Connect to all related memory nodes
      data.connectedMemoryNodes.forEach((memoryNodeId) => {
        const connectionStrength = Math.min(connections, 5) // Cap edge thickness

        edges.add({
          from: memoryNodeId,
          to: subjectNodeId,
          color: {
            color: subj.is_key_subject
              ? `rgba(255, 215, 0, ${0.3 + connectionStrength * 0.1})`
              : `rgba(143, 217, 168, ${0.3 + connectionStrength * 0.1})`,
            highlight: "#66afe9",
          },
          dashes: [3, 7], // Distinctive dashed pattern for subject connections
          arrows: { to: { enabled: false } },
          length: 100 + connections * 10, // Longer edges for shared subjects
          width: Math.min(0.5 + Math.log(connections) * 0.5, 4), // Dynamic width based on connections
          smooth: { enabled: true, type: "curvedCW", roundness: 0.3 },
        })
      })
    })

    nodesDatasetRef.current = nodes
    edgesDatasetRef.current = edges

    if (container) {
      const options: Options = {
        layout: { hierarchical: false },
        physics: {
          enabled: true,
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -80,
            centralGravity: 0.005,
            springLength: 140,
            springConstant: 0.06,
            damping: 0.6,
            avoidOverlap: 1.2,
          },
          stabilization: {
            enabled: true,
            iterations: 300,
            fit: true,
            updateInterval: 25,
            onlyDynamicEdges: false,
          },
          adaptiveTimestep: true,
          wind: { x: 0, y: 0 },
          // Mobile-specific physics optimizations
          ...(isMobile && {
            stabilization: {
              enabled: true,
              iterations: 200, // Fewer iterations for faster stabilization on mobile
              fit: true,
              updateInterval: 50, // Slower updates for better performance on mobile
              onlyDynamicEdges: false,
            },
            adaptiveTimestep: true,
            // Reduce physics complexity on mobile for better performance
            forceAtlas2Based: {
              gravitationalConstant: -60, // Reduced gravity for more stable layout
              centralGravity: 0.003,
              springLength: 120,
              springConstant: 0.08,
              damping: 0.7, // Increased damping for stability
              avoidOverlap: 1.0,
            },
          }),
        },
        interaction: {
          dragNodes: true,
          tooltipDelay: 150,
          hover: true,
          zoomView: true,
          dragView: true,
          multiselect: false,
          selectable: true,
          selectConnectedEdges: true,
          hoverConnectedEdges: true,
          // Mobile-specific touch optimizations
          touch: {
            enabled: true,
            delay: 0, // Remove delay for immediate response
            pinchToZoom: true,
            panToDrag: true,
          },
          // Ensure click events work properly on mobile
          clickToUse: false,
          // Mobile-specific improvements
          ...(isMobile && {
            tooltipDelay: 0, // Immediate tooltip on mobile
            hover: false, // Disable hover on mobile for better touch
            dragNodes: false, // Disable node dragging on mobile to prevent accidental moves
          }),
          // Additional mobile optimizations
          ...(isMobile && {
            // Ensure proper touch event handling
            touch: {
              enabled: true,
              delay: 0,
              pinchToZoom: true,
              panToDrag: true,
            },
            // Disable features that don't work well on mobile
            keyboard: false,
            // Ensure immediate response
            clickToUse: false,
          }),
        },
        nodes: {
          borderWidth: 2,
          font: { color: nodeFontColor, size: 12, face: "Inter, Arial" },
          // Mobile-specific node improvements
          ...(isMobile && {
            size: 20, // Ensure minimum size for touch
            borderWidth: 3, // Thicker borders for better visibility
            shadow: true, // Enable shadows for better depth perception
          }),
        },
        edges: {
          smooth: { enabled: true, type: "dynamic", roundness: 0.4 },
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

        // Ensure mobile-specific settings are applied immediately
        if (isMobile) {
          // Force immediate interaction readiness on mobile
          setTimeout(() => {
            if (networkRef.current) {
              networkRef.current.setOptions({
                interaction: {
                  tooltipDelay: 0,
                  hover: false,
                  dragNodes: false,
                },
              })
            }
          }, 100)
        }

        networkRef.current.on("click", (params) => {
          if (params.nodes.length > 0) {
            const clickedNodeId = params.nodes[0] as string
            handleNodeClick(clickedNodeId)
          }
        })

        // Mobile-specific optimizations are handled in the options above

        // Add additional event handling for better mobile compatibility
        if (isMobile) {
          // Ensure the network is ready for interaction immediately
          networkRef.current.on("stabilizationIterationsDone", () => {
            // Force the network to be immediately interactive on mobile
            if (networkRef.current) {
              networkRef.current.setOptions({
                interaction: {
                  tooltipDelay: 0,
                  hover: false,
                },
              })
            }
          })
        }
      }

      networkRef.current.once("stabilizationIterationsDone", () => {
        setIsReady(true)
        setTimeout(() => {
          fitAllNodes()
        }, 200)
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

      const resizeObserver = new ResizeObserver(() => {
        if (isReady && networkRef.current && !isFittingRef.current) {
          if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current)
          fitTimeoutRef.current = setTimeout(() => fitAllNodes(), 300)
        }
      })
      if (container) resizeObserver.observe(container)

      if (networkRef.current && (memories.length > 0 || nodes.length > 1)) {
        networkRef.current.stabilize(300)
      }

      return () => {
        if (container) resizeObserver.unobserve(container)
        resizeObserver.disconnect()
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
  }, [memories, rootNodeConfig, handleNodeClick, fitAllNodes, isMobile, theme])

  useEffect(() => {
    if (
      isReady &&
      (memories.length > 0 ||
        (nodesDatasetRef.current && nodesDatasetRef.current.length > 1)) &&
      !isFittingRef.current
    ) {
      if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current)
      fitTimeoutRef.current = setTimeout(() => fitAllNodes(), 200)
    }
  }, [isReady, memories.length, fitAllNodes])

  if (
    memories.length === 0 &&
    rootNodeConfig.isQueryNode &&
    !isReady &&
    containerRef.current?.parentElement?.style.display !== "none"
  ) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[150px] text-muted-foreground text-lg text-center gap-3">
        <Brain size={32} className="text-primary/60" />
        <p className="text-base font-medium">Your Neural Memory Network</p>
        <p className="text-sm opacity-70">
          Search to explore your AI&apos;s hippocampus
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-[300px] relative">
      {/* Network Controls */}
      <div className="memory-network-controls">
        <button
          className="memory-network-control-button"
          onClick={fitAllNodes}
          title="Fit to screen"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Legend */}
      {showLegend ? (
        <div className="memory-network-legend">
          <div className="legend-header">
            <span className="legend-title">Legend</span>
            <button
              className="legend-close"
              onClick={() => setShowLegend(false)}
            >
              <X size={14} />
            </button>
          </div>

          <div className="legend-item">
            <span className="legend-swatch node query"></span>
            <span>Query Root</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch node memory"></span>
            <span>Memory</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch node subject"></span>
            <span>Subject</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch node key-subject"></span>
            <span>Key Subject</span>
          </div>

          <div className="legend-note">Node size = connection count</div>
        </div>
      ) : (
        <button
          className="memory-network-legend-toggle"
          onClick={() => setShowLegend(true)}
          title="Show legend"
        >
          <Info size={16} />
        </button>
      )}

      {/* Network Statistics */}
      {showStats && (
        <div className="memory-network-stats">
          <div className="memory-network-stats-title">🧠 Neural Activity</div>
          <div className="memory-network-stats-item">
            <span>Memories:</span>
            <span className="memory-network-stats-value">
              {networkStats.totalMemories}
            </span>
          </div>
          <div className="memory-network-stats-item">
            <span>Subjects:</span>
            <span className="memory-network-stats-value">
              {networkStats.totalSubjects}
            </span>
          </div>
          <div className="memory-network-stats-item">
            <span>Key Subjects:</span>
            <span className="memory-network-stats-value">
              {networkStats.keySubjects}
            </span>
          </div>
          <div className="memory-network-stats-item">
            <span>Max Depth:</span>
            <span className="memory-network-stats-value">
              {networkStats.memoryDepth}
            </span>
          </div>
          <div className="memory-network-stats-item">
            <span>Avg Subjects:</span>
            <span className="memory-network-stats-value">
              {networkStats.avgSubjectsPerMemory}
            </span>
          </div>
        </div>
      )}

      {/* Floating Memory Preview */}
      {selectedNodeForModal && selectedNodeForModal.memory && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedNodeForModal(null)}
          />
          <div
            className="memory-preview-card fixed z-50"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => {
              // Prevent clicks inside the modal from bubbling up to the backdrop
              e.stopPropagation()
            }}
          >
            {(() => {
              const memory = selectedNodeForModal.memory!
              const memoryType = getMemoryType(memory)
              const details = pairDetails[memory.id]

              return (
                <>
                  <div className="memory-preview-header">
                    <div className="memory-preview-icon">{memoryType.icon}</div>
                    <div className="memory-preview-title">
                      {memoryType.type.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => {
                          // Store the current node stats before opening chat
                          console.log(
                            "Opening chat message, selectedNodeForModal:",
                            selectedNodeForModal
                          )

                          // Store in both state and ref for reliability
                          setPreviousNodeStats(selectedNodeForModal)
                          previousNodeStatsRef.current = selectedNodeForModal

                          if (selectedNodeForModal.memory) {
                            setShowChatMessage({
                              memory: selectedNodeForModal.memory,
                              position: selectedNodeForModal.position,
                            })
                            setSelectedNodeForModal(null)
                          }
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Open Chat Message"
                      >
                        <MessageCircle size={16} className="text-blue-400" />
                      </button>
                      <button
                        onClick={() => setSelectedNodeForModal(null)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Close"
                      >
                        <X size={16} className="text-white/60" />
                      </button>
                    </div>
                  </div>
                  <div className="memory-preview-content">
                    {memory.prompt || "No content available"}
                  </div>
                  {details && details.subjects.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-white/80 mb-2">
                        Related Subjects ({details.subjects.length})
                      </div>
                      <div className="memory-preview-subjects">
                        {details.subjects.map((subj, idx) => (
                          <div
                            key={idx}
                            className={`memory-preview-subject ${subj.is_key_subject ? "key-subject" : ""}`}
                          >
                            {subj.subject_text} ({subj.pair_count})
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Floating Key Subject Preview */}
      {selectedKeySubject && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedKeySubject(null)}
          />
          <div
            className="memory-preview-card fixed z-50"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => {
              // Prevent clicks inside the modal from bubbling up to the backdrop
              e.stopPropagation()
            }}
          >
            {(() => {
              console.log(
                "Rendering key subject modal for:",
                selectedKeySubject.subject
              )
              const subject = selectedKeySubject.subject
              const subjectId = subject.id
              const subjectName = subject.subject_text
              const subjectDescription = subject.description

              /* Connected Memory Pairs section removed */

              return (
                <>
                  <div className="memory-preview-header">
                    <div className="memory-preview-icon">⭐</div>
                    <div className="memory-preview-title">
                      Key Subject: {subjectName}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => setSelectedKeySubject(null)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Close"
                      >
                        <X size={16} className="text-white/60" />
                      </button>
                    </div>
                  </div>
                  <div className="memory-preview-content">
                    <div className="mb-3">
                      <p className="text-sm text-white/90 mb-2">
                        <strong>Subject:</strong> {subjectName}
                      </p>
                      {subjectDescription && (
                        <p className="text-sm text-white/80 mb-2">
                          <strong>Description:</strong> {subjectDescription}
                        </p>
                      )}
                    </div>

                    <div className="mb-4 p-4 bg-white/5 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-400 mb-3">
                        📊 Statistics
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/70">
                            Total Connections:
                          </span>
                          <span className="font-medium text-green-400">
                            {subject.pair_count}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Subject Type:</span>
                          <span className="font-medium text-yellow-400">
                            {subject.is_key_subject ? "Key Subject" : "Regular"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Network Impact:</span>
                          <span className="font-medium text-purple-400">
                            {(
                              (subject.pair_count / totalMemories) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">
                            Relevance Score:
                          </span>
                          <span className="font-medium text-orange-400">
                            {Math.min(subject.pair_count * 20, 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Connected Memory Pairs section removed to avoid modal overflow */}
                  </div>
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Floating Chat Message View */}
      {showChatMessage && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowChatMessage(null)}
          />
          <div
            className={`memory-preview-card fixed z-50 transition-all duration-300 ease-in-out ${
              isAnimatingBack
                ? "animate-slide-out-left"
                : "animate-slide-in-right"
            }`}
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => {
              // Prevent clicks inside the modal from bubbling up to the backdrop
              e.stopPropagation()
            }}
          >
            {(() => {
              const memory = showChatMessage.memory

              // Edge case: memory object validation
              if (!memory || !memory.id) {
                return (
                  <div className="p-4 text-center">
                    <div className="text-red-400 mb-2">⚠️</div>
                    <div className="text-white/80">Invalid memory data</div>
                    <button
                      onClick={() => setShowChatMessage(null)}
                      className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )
              }

              const memoryType = getMemoryType(memory)

              return (
                <>
                  <div className="memory-preview-header">
                    <div className="memory-preview-icon">{memoryType.icon}</div>
                    <div className="memory-preview-title">Chat Message</div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => {
                          // Prevent multiple rapid clicks during animation
                          if (isAnimatingBack) return

                          console.log(
                            "Back button clicked, previousNodeStats:",
                            previousNodeStats
                          )
                          console.log(
                            "Back button clicked, previousNodeStatsRef:",
                            previousNodeStatsRef.current
                          )

                          // Animate back to node stats
                          setIsAnimatingBack(true)

                          // Use a shorter timeout to make the transition feel more responsive
                          setTimeout(() => {
                            // Try state first, then ref as fallback
                            const statsToRestore =
                              previousNodeStats || previousNodeStatsRef.current

                            if (statsToRestore && statsToRestore.memory) {
                              console.log(
                                "Restoring node stats:",
                                statsToRestore
                              )
                              // Set the node stats immediately
                              setSelectedNodeForModal(statsToRestore)
                              // Close the chat and clean up
                              setShowChatMessage(null)
                              setPreviousNodeStats(null)
                              previousNodeStatsRef.current = null
                              setIsAnimatingBack(false)
                            } else {
                              console.log(
                                "No valid previousNodeStats, just closing"
                              )
                              setShowChatMessage(null)
                              setIsAnimatingBack(false)
                            }
                          }, 250) // Slightly shorter than the CSS animation
                        }}
                        className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${
                          isAnimatingBack ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        title="Back to Node Stats"
                        disabled={isAnimatingBack}
                      >
                        <ArrowLeft size={16} className="text-blue-400" />
                      </button>
                      <button
                        onClick={() => {
                          // Prevent closing during back animation
                          if (isAnimatingBack) return
                          setShowChatMessage(null)
                        }}
                        className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${
                          isAnimatingBack ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        title="Close"
                        disabled={isAnimatingBack}
                      >
                        <X size={16} className="text-white/60" />
                      </button>
                    </div>
                  </div>
                  <div className="memory-preview-content">
                    <div className="space-y-4">
                      {/* User Message */}
                      {memory.prompt && (
                        <div className="mb-4">
                          <ChatMessage
                            content={memory.prompt}
                            timestamp={memory.timestamp}
                            isUser={true}
                            isLast={false}
                            isOptimistic={false}
                            menuProps={{
                              onCopy: () => {
                                navigator.clipboard
                                  .writeText(memory.prompt)
                                  .then(() =>
                                    toast.success("Copied to clipboard")
                                  )
                                  .catch(() => toast.error("Failed to copy"))
                              },
                              onDelete: () => {
                                toast.info(
                                  "Delete not available in network view"
                                )
                              },
                              onShowMemories: () => {
                                toast.info("Already viewing memory network")
                              },
                              id: memory.id,
                            }}
                          />
                        </div>
                      )}
                      {/* Ditto's Response */}
                      {memory.response && (
                        <div>
                          <ChatMessage
                            content={memory.response}
                            timestamp={memory.timestamp}
                            isUser={false}
                            isLast={false}
                            isOptimistic={false}
                            menuProps={{
                              onCopy: () => {
                                navigator.clipboard
                                  .writeText(memory.response)
                                  .then(() =>
                                    toast.success("Copied to clipboard")
                                  )
                                  .catch(() => toast.error("Failed to copy"))
                              },
                              onDelete: () => {
                                toast.info(
                                  "Delete not available in network view"
                                )
                              },
                              onShowMemories: () => {
                                toast.info("Already viewing memory network")
                              },
                              id: memory.id,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </>
      )}

      <div
        ref={containerRef}
        className="flex-1 relative w-full rounded-lg bg-muted border border-border overflow-hidden"
        style={{ visibility: isReady ? "visible" : "hidden" }}
      />

      {!isReady &&
        nodesDatasetRef.current &&
        nodesDatasetRef.current.length > 0 && (
          <div className="memory-network-loading">
            <div className="memory-network-loading-spinner"></div>
            <div className="memory-network-loading-text">
              Mapping your neural pathways...
            </div>
          </div>
        )}
    </div>
  )
}

export default MemoriesNetworkGraph
