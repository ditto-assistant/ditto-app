import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Info,
  Search,
  Target,
  Route,
  BarChart3,
  Zap,
  Brain,
  Eye,
} from "lucide-react"
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
  const [tracingPath, setTracingPath] = useState<string[]>([])
  const [previewNode, setPreviewNode] = useState<{
    nodeId: string
    x: number
    y: number
  } | null>(null)
  const { isMobile } = usePlatform()
  const { theme } = useTheme()

  const isFittingRef = useRef<boolean>(false)
  const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate network statistics
  const networkStats = React.useMemo(() => {
    const totalMemories = memories.length + 1 // +1 for root
    const totalSubjects = Object.values(pairDetails).reduce(
      (sum, pd) => sum + pd.subjects.length,
      0
    )
    const keySubjects = Object.values(pairDetails).reduce(
      (sum, pd) => sum + pd.subjects.filter((s) => s.is_key_subject).length,
      0
    )
    const avgSubjectsPerMemory =
      totalMemories > 0 ? (totalSubjects / totalMemories).toFixed(1) : "0"

    return {
      totalMemories,
      totalSubjects,
      keySubjects,
      avgSubjectsPerMemory,
      memoryDepth: Math.max(...memories.map((m) => getMemoryDepth(m)), 1),
    }
  }, [memories, pairDetails])

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

  const handleNodeHover = useCallback((nodeId: string, event: any) => {
    if (!networkRef.current) return
    const memory = memoryMapRef.current.get(nodeId)
    if (memory && typeof memory === "object" && "prompt" in memory) {
      const canvasPos = networkRef.current.getPositions([nodeId])[nodeId]
      if (canvasPos) {
        const domPos = networkRef.current.canvasToDOM(canvasPos)
        setPreviewNode({ nodeId, x: domPos.x, y: domPos.y })
      }
    }
  }, [])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const clickedItem = memoryMapRef.current.get(nodeId)
      if (
        clickedItem &&
        !(clickedItem as RootNodeConfig).isQueryNode &&
        !("query" in clickedItem)
      ) {
        const clickedMemory = clickedItem as Memory
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
        showMemoryNode(clickedMemory as MemoryWithLevel)
        setTimeout(() => setIsOpeningNode(false), 500)
      }
    },
    [showMemoryNode]
  )

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
        const edgeClass =
          relevanceScore > 0.8
            ? "strong-connection"
            : relevanceScore < 0.3
              ? "weak-connection"
              : ""

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

      // Enhanced subject nodes with better positioning and styling
      const details = pairDetails[memory.id]
      if (details && details.subjects && details.subjects.length > 0) {
        const limited = [...details.subjects]
          .sort((a, b) => b.pair_count - a.pair_count)
          .slice(0, MAX_SUBJECTS_PER_PAIR)

        // Smart circular arrangement avoiding overlap
        const subjectCount = limited.length
        const baseRadius = 50 + subjectCount * 5
        const angleOffset = Math.random() * Math.PI * 2 // Randomize starting angle

        limited.forEach((subj, idx) => {
          const subjectNodeId = `${nodeId}-sub-${subj.id}`
          const angle = angleOffset + (idx * (2 * Math.PI)) / subjectCount
          const radiusVariation = baseRadius + (Math.random() - 0.5) * 10 // Add slight variation

          const subjectSize = Math.min(
            SUBJECT_NODE_SIZE + Math.log(subj.pair_count) * 2,
            22
          )
          const subjectColor = subj.is_key_subject
            ? KEY_SUBJECT_COLOR
            : SUBJECT_NODE_COLOR

          nodes.add({
            id: subjectNodeId,
            label: `${subj.subject_text.substring(0, 16)}${subj.subject_text.length > 16 ? "..." : ""}\n(${subj.pair_count})`,
            title: `Subject: ${subj.subject_text}\nConnected to ${subj.pair_count} memories\n${subj.is_key_subject ? "⭐ Key Subject" : "Regular Subject"}${subj.description ? `\n\n${subj.description}` : ""}`,
            color: {
              background: subjectColor,
              border: subj.is_key_subject ? "#FFD700" : "#2ECC71",
              highlight: { background: "#7289da", border: "#ffffff" },
            },
            level: depth + 2,
            shape: "dot",
            size: subjectSize,
            font: {
              size: 9,
              color: "#ffffff",
              face: "Inter, Arial",
              multi: "md",
              strokeWidth: 1,
              strokeColor: "#000000",
            },
            opacity: opacity * 0.9,
            x:
              (persistedNodePositions[nodeId]?.x ?? 0) +
              Math.cos(angle) * radiusVariation,
            y:
              (persistedNodePositions[nodeId]?.y ?? 0) +
              Math.sin(angle) * radiusVariation,
          })

          // Enhanced subject edges with organic curves
          edges.add({
            from: nodeId,
            to: subjectNodeId,
            color: {
              color: subj.is_key_subject
                ? "rgba(255, 215, 0, 0.6)"
                : "rgba(143, 217, 168, 0.6)",
              highlight: "#66afe9",
            },
            dashes: [5, 5],
            arrows: { to: { enabled: false } },
            length: 35,
            width: Math.min(1 + Math.log(subj.pair_count) * 0.5, 3),
            smooth: { enabled: true, type: "curvedCW", roundness: 0.2 },
          })
        })
      }

      if (memory.children && memory.children.length > 0) {
        memory.children.forEach((child) => {
          addMemoryRecursive(child, nodeId, depth + 1, `${path}-${memory.id}`)
        })
      }
    }

    memories.forEach((rootMemory, index) => {
      addMemoryRecursive(rootMemory, rootNodeConfig.id, 0, `root${index}`)
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

        networkRef.current.on("hoverNode", (params) => {
          handleNodeHover(params.node, params.event)
        })

        networkRef.current.on("blurNode", () => {
          setPreviewNode(null)
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
    pairDetails,
    networkStats,
    handleNodeHover,
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
          Search to explore your AI's hippocampus
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
        <button
          className="memory-network-control-button"
          onClick={() => setTracingPath([])}
          title="Clear Path Trace"
        >
          <Route size={18} />
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
      {previewNode && (
        <div
          className="memory-preview-card"
          style={{
            left: Math.min(previewNode.x + 20, window.innerWidth - 340),
            top: Math.max(previewNode.y - 100, 20),
          }}
        >
          {(() => {
            const memory = memoryMapRef.current.get(previewNode.nodeId)
            if (!memory || typeof memory !== "object" || !("prompt" in memory))
              return null
            const memoryType = getMemoryType(memory as Memory)
            const details = pairDetails[(memory as Memory).id]

            return (
              <>
                <div className="memory-preview-header">
                  <div className="memory-preview-icon">{memoryType.icon}</div>
                  <div className="memory-preview-title">
                    {memoryType.type.toUpperCase()}
                  </div>
                </div>
                <div className="memory-preview-content">
                  {(memory as Memory).prompt || "No content available"}
                </div>
                {details && details.subjects.length > 0 && (
                  <div className="memory-preview-subjects">
                    {details.subjects.slice(0, 4).map((subj, idx) => (
                      <div
                        key={idx}
                        className={`memory-preview-subject ${subj.is_key_subject ? "key-subject" : ""}`}
                      >
                        {subj.subject_text} ({subj.pair_count})
                      </div>
                    ))}
                    {details.subjects.length > 4 && (
                      <div className="memory-preview-subject">
                        +{details.subjects.length - 4} more
                      </div>
                    )}
                  </div>
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
