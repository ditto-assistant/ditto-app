import React, { useState, useEffect, useRef, useCallback } from "react"
import { Target, BarChart3, Brain, MessageCircle, X } from "lucide-react"
import { Memory } from "@/api/getMemories"
import { usePlatform } from "@/hooks/usePlatform"
import { useTheme } from "@/components/theme-provider"
import {
  useMemoryNodeViewer,
  MemoryWithLevel,
} from "@/hooks/useMemoryNodeViewer"
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
  const { showMemoryNode } = useMemoryNodeViewer()
  const { pairDetails } = useMemoryNetwork()
  const [isReady, setIsReady] = useState(false)
  const [isOpeningNode, setIsOpeningNode] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [selectedNode, setSelectedNode] = useState<{
    nodeId: string
    memory: Memory
    x: number
    y: number
  } | null>(null)
  const { isMobile } = usePlatform()
  const { theme } = useTheme()

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

  const handleNodeClick = useCallback((nodeId: string) => {
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
          setSelectedNode({
            nodeId,
            memory: clickedMemory,
            x: domPos.x,
            y: domPos.y,
          })
        }
      }
    }
  }, [])

  useEffect(() => {
    if (isOpeningNode) return

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

    if (!isOpeningNode) setIsReady(false)

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
        },
        nodes: {
          borderWidth: 2,
          font: { color: nodeFontColor, size: 12, face: "Inter, Arial" },
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

        networkRef.current.on("click", (params) => {
          if (params.nodes.length > 0) {
            const clickedNodeId = params.nodes[0] as string
            handleNodeClick(clickedNodeId)
          }
        })
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
  }, [
    memories,
    rootNodeConfig,
    handleNodeClick,
    isOpeningNode,
    fitAllNodes,
    isMobile,
    theme,
  ])

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
          title="Fit All Nodes"
        >
          <Target size={18} />
        </button>
        <button
          className={`memory-network-control-button ${showStats ? "active" : ""}`}
          onClick={() => setShowStats(!showStats)}
          title="Toggle Statistics"
        >
          <BarChart3 size={18} />
        </button>
      </div>

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
      {selectedNode && (
        <div
          className="memory-preview-card fixed z-50"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "400px",
            minWidth: "320px",
          }}
        >
          {(() => {
            const memory = selectedNode.memory
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
                        setIsOpeningNode(true)
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
                        showMemoryNode(memory as MemoryWithLevel)
                        setSelectedNode(null)
                        setTimeout(() => setIsOpeningNode(false), 500)
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Open Chat Message"
                    >
                      <MessageCircle size={16} className="text-blue-400" />
                    </button>
                    <button
                      onClick={() => setSelectedNode(null)}
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
      )}

      <div
        ref={containerRef}
        className="flex-1 relative w-full rounded-lg bg-muted border border-border overflow-hidden"
        style={{ visibility: isReady ? "visible" : "hidden" }}
      />

      {!isReady &&
        nodesDatasetRef.current &&
        nodesDatasetRef.current.length > 0 &&
        !isOpeningNode && (
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
