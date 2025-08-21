import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  BarChart3,
  Brain,
  MessageCircle,
  X,
  Info,
  Maximize2,
  ArrowLeft,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import ChatMessage from "@/components/ChatMessage"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { Memory } from "@/api/getMemories"
import { usePlatform } from "@/hooks/usePlatform"
import { useTheme } from "@/components/theme-provider"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { DataSet } from "vis-data"
import {
  Network as VisNetwork,
  Node,
  Edge,
  Options,
  FitOptions,
} from "vis-network"
import { ComprehensivePairDetails, PairSubject } from "@/api/kg"

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
  pairDetails?: Record<string, ComprehensivePairDetails>
  onRootNodeClick?: () => void
  viewMode?: "cards" | "graph"
  onViewModeChange?: (mode: "cards" | "graph") => void
  showCardViewControls?: boolean
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

// Image detection in memory content
const hasImages = (content: string): boolean => {
  return (
    content.includes("![") && content.includes("](") && content.includes(")")
  )
}

// Memory depth calculation
const getMemoryDepth = (memory: Memory): number => {
  if (!memory.children || memory.children.length === 0) return 1
  return 1 + Math.max(...memory.children.map(getMemoryDepth))
}

const MemoriesNetworkGraph: React.FC<MemoriesNetworkGraphProps> = ({
  memories,
  rootNodeConfig,
  pairDetails: externalPairDetails,
  onRootNodeClick,
  viewMode: externalViewMode,
  onViewModeChange,
  showCardViewControls = true,
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
  const subjectMapRef = useRef<Map<string, PairSubject>>(new Map())
  const initializationRef = useRef<boolean>(false)

  // Removed useMemoryNodeViewer - now using inline chat message view
  const { pairDetails: contextPairDetails } = useMemoryNetwork()
  const [isReady, setIsReady] = useState(false)
  // Removed isOpeningNode - no longer needed with inline chat view
  const [showLegend, setShowLegend] = useState(true)
  const [showNeuralActivity, setShowNeuralActivity] = useState(true)
  const [selectedNodeForModal, setSelectedNodeForModal] = useState<{
    memory: Memory | null
    position: { x: number; y: number }
  } | null>(null)
  const [selectedKeySubject, setSelectedKeySubject] = useState<{
    subject: PairSubject
    position: { x: number; y: number }
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
  const [internalViewMode, setInternalViewMode] = useState<"graph" | "cards">(
    "graph"
  )

  // Use external viewMode if provided, otherwise use internal state
  const viewMode = externalViewMode ?? internalViewMode
  const setViewMode = onViewModeChange ?? setInternalViewMode
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const { isMobile } = usePlatform()
  const { theme } = useTheme()

  // Use external pair details if provided, otherwise fall back to context
  const pairDetails = externalPairDetails || contextPairDetails

  // Custom hook for network initialization
  const useNetworkInitialization = () => {
    const lastDataRef = useRef<string>("")

    return useMemo(() => {
      // Create a simple hash of the important data
      const dataHash = JSON.stringify({
        memoriesLength: memories.length,
        memoriesIds: memories
          .map((m) => m.id)
          .sort()
          .join(","), // Track actual memory IDs
        rootId: rootNodeConfig.id,
        rootLabel: rootNodeConfig.label,
        pairDetailsKeys: Object.keys(pairDetails).sort().join(","),
        pairDetailsLength: Object.keys(pairDetails).length, // Track pair details count
        theme,
      })

      if (lastDataRef.current !== dataHash) {
        lastDataRef.current = dataHash
        return true
      }

      return false
    }, [
      memories.length,
      memories.map((m) => m.id).join(","),
      rootNodeConfig.id,
      rootNodeConfig.label,
      Object.keys(pairDetails).join(","),
      Object.keys(pairDetails).length,
      theme,
    ])
  }

  const shouldRebuildNetwork = useNetworkInitialization()

  // Memoize network statistics for rendering
  const networkStats = useMemo(() => {
    const totalMemories = memories.length + 1
    const totalSubjects = Object.values(pairDetails).reduce(
      (sum, pd) => sum + pd.subjects.length,
      0
    )
    const keySubjects = Object.values(pairDetails).reduce(
      (sum, pd) =>
        sum + pd.subjects.filter((s: PairSubject) => s.is_key_subject).length,
      0
    )

    return {
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
  }, [memories, pairDetails])

  // Memoize ranked memories for card view
  const rankedMemories = useMemo(() => {
    const allMemories: Array<{
      memory: Memory
      depth: number
      rank: number
      parentRank?: number
      childRank?: number
    }> = []

    // Add L1 memories (depth 1)
    memories.forEach((memory, index) => {
      allMemories.push({
        memory,
        depth: 1,
        rank: index + 1,
        parentRank: undefined,
        childRank: undefined,
      })

      // Add L2 memories (depth 2) with parent-child ranking
      if (memory.children && memory.children.length > 0) {
        memory.children.forEach((child, childIndex) => {
          allMemories.push({
            memory: child,
            depth: 2,
            rank: index + 1,
            parentRank: index + 1,
            childRank: childIndex + 1,
          })
        })
      }
    })

    // Sort by relevance (L1 first, then L2, maintaining parent-child relationships)
    return allMemories.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth
      if (a.depth === 2 && a.parentRank !== b.parentRank) {
        return (a.parentRank || 0) - (b.parentRank || 0)
      }
      return (a.childRank || 0) - (b.childRank || 0)
    })
  }, [memories])

  // Minimize overlays by default on mobile
  useEffect(() => {
    const isSmall = window.matchMedia("(max-width: 768px)").matches
    if (isSmall) {
      setShowLegend(false)
      setShowNeuralActivity(false)
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (networkRef.current) {
        networkRef.current.redraw()
        networkRef.current.setSize("100%", "100%")
        setTimeout(() => {
          fitAllNodes()
        }, 100)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Cleanup animation state when modals are closed
  useEffect(() => {
    if (!showChatMessage && !selectedNodeForModal && !selectedKeySubject) {
      setIsAnimatingBack(false)
    }
  }, [showChatMessage, selectedNodeForModal, selectedKeySubject])

  // Cleanup all modals when view mode changes
  useEffect(() => {
    if (viewMode === "cards") {
      // Clear all modals when switching to card view to prevent z-index conflicts
      setShowChatMessage(null)
      setSelectedNodeForModal(null)
      setSelectedKeySubject(null)
      setIsAnimatingBack(false)
    }
  }, [viewMode])

  // Cleanup all modals when memories change to prevent stale modal states
  useEffect(() => {
    return () => {
      // Cleanup function to clear all modals when component unmounts or memories change
      setShowChatMessage(null)
      setSelectedNodeForModal(null)
      setSelectedKeySubject(null)
      setIsAnimatingBack(false)
    }
  }, [memories])

  const isFittingRef = useRef<boolean>(false)
  const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Mobile touch handling state
  const [lastTouchTime, setLastTouchTime] = useState(0)
  const [isProcessingClick, setIsProcessingClick] = useState(false)

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      console.log("Node clicked:", nodeId)

      // Mobile touch debouncing to prevent double-clicks
      const isMobile = window.innerWidth <= 768
      const now = Date.now()

      if (isMobile) {
        // Prevent rapid successive clicks on mobile
        if (now - lastTouchTime < 500 || isProcessingClick) {
          console.log("Mobile: Ignoring rapid click/double-tap")
          return
        }
        setLastTouchTime(now)
        setIsProcessingClick(true)

        // Reset processing flag after a delay
        setTimeout(() => setIsProcessingClick(false), 600)
      }

      // Handle root node click
      if (nodeId === rootNodeConfig.id && onRootNodeClick) {
        if (isMobile) {
          // Add extra delay on mobile to ensure modal renders properly
          setTimeout(() => onRootNodeClick(), 100)
        } else {
          onRootNodeClick()
        }
        return
      }

      // Check if this is a subject node (nodeId format: "shared-subject-subjectId")
      if (nodeId.startsWith("shared-subject-")) {
        // Find the subject in our subject map (more reliable than searching pairDetails)
        const foundSubject = subjectMapRef.current.get(nodeId)

        if (foundSubject) {
          // Get canvas position for modal placement
          const canvas = containerRef.current?.querySelector("canvas")
          if (canvas && networkRef.current) {
            const canvasPosition = canvas.getBoundingClientRect()
            const nodePosition = networkRef.current.getPositions([nodeId])[
              nodeId
            ]

            if (nodePosition) {
              // Convert network coordinates to screen coordinates
              const scale = networkRef.current.getScale()
              const viewPosition = networkRef.current.getViewPosition()

              const screenX =
                canvasPosition.left +
                (nodePosition.x - viewPosition.x) * scale +
                canvasPosition.width / 2
              const screenY =
                canvasPosition.top +
                (nodePosition.y - viewPosition.y) * scale +
                canvasPosition.height / 2

              setSelectedKeySubject({
                subject: foundSubject,
                position: { x: screenX, y: screenY },
              })
            }
          }
        }
        return
      }

      // Check if this is a memory node
      const memory = memoryMapRef.current.get(nodeId)
      if (memory && "prompt" in memory) {
        // Get canvas position for modal placement
        const canvas = containerRef.current?.querySelector("canvas")
        if (canvas && networkRef.current) {
          const canvasPosition = canvas.getBoundingClientRect()
          const nodePosition = networkRef.current.getPositions([nodeId])[nodeId]

          if (nodePosition) {
            // Convert network coordinates to screen coordinates
            const scale = networkRef.current.getScale()
            const viewPosition = networkRef.current.getViewPosition()

            const screenX =
              canvasPosition.left +
              (nodePosition.x - viewPosition.x) * scale +
              canvasPosition.width / 2
            const screenY =
              canvasPosition.top +
              (nodePosition.y - viewPosition.y) * scale +
              canvasPosition.height / 2

            setSelectedNodeForModal({
              memory: memory as Memory,
              position: { x: screenX, y: screenY },
            })
          }
        }
      }
    },
    [rootNodeConfig, onRootNodeClick]
  )

  // Network building effect - simplified and stable
  useEffect(() => {
    if (
      !shouldRebuildNetwork ||
      !containerRef.current ||
      initializationRef.current
    ) {
      return
    }

    const buildNetwork = () => {
      let effectiveTheme = theme
      if (theme === "system") {
        effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light"
      }
      const nodeFontColor = effectiveTheme === "dark" ? "#FFFFFF" : "#333333"

      const container = containerRef.current
      if (!container) return

      const nodes = new DataSet<Node>()
      const edges = new DataSet<Edge>()
      memoryMapRef.current.clear()
      subjectMapRef.current.clear()

      setIsReady(false)
      initializationRef.current = true

      // Enhanced root node with neural styling
      const rootSize = 35 + Math.min(networkStats.totalSubjects * 2, 15)

      // Clean root node label by replacing markdown image syntax with emoji
      let cleanRootLabel = rootNodeConfig.label
      if (
        rootNodeConfig.originalMemory &&
        hasImages(rootNodeConfig.originalMemory.prompt || "")
      ) {
        cleanRootLabel = cleanRootLabel.replace(/!\[[^\]]*\]\([^)]+\)/g, "🖼️")
      }

      nodes.add({
        id: rootNodeConfig.id,
        label:
          cleanRootLabel.substring(0, 30) +
          (cleanRootLabel.length > 30 ? "..." : ""),
        title: `${rootNodeConfig.title || cleanRootLabel}\n\n🧠 Neural Activity:\n• ${networkStats.totalMemories} memories\n• ${networkStats.totalSubjects} subjects\n• ${networkStats.keySubjects} key subjects`,
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
        memoryMapRef.current.set(
          rootNodeConfig.id,
          rootNodeConfig.originalMemory
        )
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

        // Clean prompt text by replacing markdown image syntax with emoji
        let cleanPrompt = memory.prompt || ""
        const promptHasImages = hasImages(cleanPrompt)
        if (promptHasImages) {
          // Replace ![alt](url) with 🖼️
          cleanPrompt = cleanPrompt.replace(/!\[[^\]]*\]\([^)]+\)/g, "🖼️")
        }

        const label = cleanPrompt
          ? cleanPrompt.substring(0, 20) +
            (cleanPrompt.length > 20 ? "..." : "")
          : "Memory"

        // Enhanced node with depth-based sizing and opacity
        // L1 memory nodes (depth = 1) are 30% larger for better visibility
        let nodeSize = Math.max(28 - depth * 4, 12)
        if (depth === 1) {
          nodeSize = Math.floor(nodeSize * 1.3) // 30% larger for L1 memories
        }
        const opacity = Math.max(1 - depth * 0.15, 0.6)

        nodes.add({
          id: nodeId,
          label: `${memoryType.icon} ${label}`,
          title: `${memoryType.type.toUpperCase()}\n${cleanPrompt ? `Prompt: ${cleanPrompt}` : "Memory"}\n\nDepth: Level ${depth + 1}`,
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
          subject: PairSubject
          connectedMemoryNodes: string[]
          totalConnections: number
        }
      >()

      // Collect all subjects and their connections
      Object.entries(pairDetails).forEach(([pairId, details]) => {
        if (details && details.subjects && details.subjects.length > 0) {
          details.subjects.forEach((subj: PairSubject) => {
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

      subjectEntries.forEach(([_, data], idx) => {
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

        // Store subject in the subject map for lookup
        subjectMapRef.current.set(subjectNodeId, subj)

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
            // Mobile-specific improvements
            ...(isMobile && {
              tooltipDelay: 0, // Immediate tooltip on mobile
              hover: false, // Disable hover on mobile for better touch
              dragNodes: false, // Disable node dragging on mobile to prevent accidental moves
            }),
          },
          // Click to use should be at top level, not in interaction
          clickToUse: false,
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

          // Add mobile-specific touch handling to prevent double-click issues
          if (isMobile) {
            let touchStartTime = 0
            let touchStartNode: string | number | null = null

            networkRef.current.on("oncontext", () => {
              // Disable context menu on mobile to prevent interference
              return false
            })

            // Override the click behavior on mobile for better control
            const canvas = container.querySelector("canvas")
            if (canvas) {
              canvas.addEventListener(
                "touchstart",
                (e) => {
                  touchStartTime = Date.now()
                  // Get the touched node if any
                  const params = networkRef.current?.getNodeAt({
                    x:
                      e.touches[0].clientX -
                      canvas.getBoundingClientRect().left,
                    y:
                      e.touches[0].clientY - canvas.getBoundingClientRect().top,
                  })
                  touchStartNode = params || null
                },
                { passive: true }
              )

              canvas.addEventListener(
                "touchend",
                (e) => {
                  const touchDuration = Date.now() - touchStartTime
                  // Only process if it's a quick tap (< 300ms) and on the same node
                  if (touchDuration < 300 && touchStartNode) {
                    const params = networkRef.current?.getNodeAt({
                      x:
                        e.changedTouches[0].clientX -
                        canvas.getBoundingClientRect().left,
                      y:
                        e.changedTouches[0].clientY -
                        canvas.getBoundingClientRect().top,
                    })

                    if (params && params === touchStartNode) {
                      // Prevent the vis-network click event from firing
                      e.preventDefault()
                      e.stopPropagation()

                      // Handle the click manually with our debouncing
                      handleNodeClick(String(params))
                    }
                  }
                  touchStartNode = null
                },
                { passive: false }
              )
            }
          }

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
          initializationRef.current = false

          // Disable physics after stabilization to prevent perpetual motion
          if (networkRef.current) {
            networkRef.current.setOptions({
              physics: {
                enabled: false,
              },
            })
          }

          // Force resize and fit
          setTimeout(() => {
            if (networkRef.current) {
              networkRef.current.redraw()
              networkRef.current.setSize("100%", "100%")
            }
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
          initializationRef.current = false
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
    }

    buildNetwork()
  }, [
    shouldRebuildNetwork,
    handleNodeClick,
    fitAllNodes,
    isMobile,
    onRootNodeClick,
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
    <div className="absolute inset-0 flex flex-col w-full h-full relative">
      {/* Network Controls */}
      {viewMode === "graph" && (
        <div className="memory-network-controls">
          <button
            className="memory-network-control-button"
            onClick={fitAllNodes}
            title="Fit to screen"
          >
            <Maximize2 size={18} />
          </button>
          {showCardViewControls && (
            <button
              className="memory-network-control-button"
              onClick={() => setViewMode("cards")}
              title="Switch to Card View"
            >
              <Grid3X3 size={18} />
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      {viewMode === "graph" && showLegend ? (
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
            <span>L2 Memory</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch node subject"></span>
            <span>L1 Memory</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch node key-subject"></span>
            <span>Key Subject</span>
          </div>

          <div className="legend-note">Node size = connection count</div>
        </div>
      ) : (
        viewMode === "graph" && (
          <button
            className="memory-network-legend-toggle"
            onClick={() => setShowLegend(true)}
            title="Show legend"
          >
            <Info size={16} />
          </button>
        )
      )}

      {/* Network Statistics */}
      {viewMode === "graph" && showNeuralActivity && (
        <div className="memory-network-stats">
          <div className="memory-network-stats-title">
            <div className="flex items-center justify-between">
              <span>🧠 Neural Activity</span>
              <button
                onClick={() => setShowNeuralActivity(false)}
                className="text-white/60 hover:text-white/90 transition-colors p-1 rounded hover:bg-white/10"
                title="Hide Neural Activity"
              >
                <X size={14} />
              </button>
            </div>
          </div>
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

      {/* Neural Activity Toggle Button (when hidden) */}
      {viewMode === "graph" && !showNeuralActivity && (
        <button
          onClick={() => setShowNeuralActivity(true)}
          className="memory-network-control-button"
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            zIndex: 30,
          }}
          title="Show Neural Activity"
        >
          <BarChart3 size={20} />
        </button>
      )}

      {/* Floating Memory Preview */}
      {selectedNodeForModal && selectedNodeForModal.memory && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-[9999] bg-black/30"
            onClick={() => setSelectedNodeForModal(null)}
          />
          <div
            className="memory-preview-card fixed z-[10000]"
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
                    {(() => {
                      const promptHasImages = hasImages(memory.prompt || "")
                      const responseHasImages = hasImages(memory.response || "")

                      if (promptHasImages || responseHasImages) {
                        return (
                          <div className="space-y-4">
                            {/* Show only the prompt content with images rendered */}
                            {memory.prompt && (
                              <MarkdownRenderer
                                content={memory.prompt}
                                className="text-sm text-white/90"
                              />
                            )}
                          </div>
                        )
                      }

                      // Fallback to plain text if no images
                      return memory.prompt || "No content available"
                    })()}
                  </div>
                  {details && details.subjects.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-white/80 mb-2">
                        Related Subjects ({details.subjects.length})
                      </div>
                      <div className="memory-preview-subjects">
                        {details.subjects.map(
                          (subj: PairSubject, idx: number) => (
                            <div
                              key={idx}
                              className={`memory-preview-subject ${subj.is_key_subject ? "key-subject" : ""}`}
                            >
                              {subj.subject_text} ({subj.pair_count})
                            </div>
                          )
                        )}
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
            className="fixed inset-0 z-[9999] bg-black/30"
            onClick={() => setSelectedKeySubject(null)}
          />
          <div
            className="memory-preview-card fixed z-[10000]"
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
                              (subject.pair_count /
                                networkStats.totalMemories) *
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

      {/* Floating Chat Message View - Use portal-like approach */}
      {showChatMessage && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-[99999] bg-black/30"
            onClick={() => {
              setShowChatMessage(null)
              // Clear any other modal states to prevent conflicts
              setSelectedNodeForModal(null)
              setSelectedKeySubject(null)
            }}
          />
          <div
            className={`memory-preview-card chat-message-modal fixed z-[100000] w-[min(90vw,520px)] max-h-[85vh] transition-all duration-300 ease-in-out ${
              isAnimatingBack
                ? "animate-slide-out-left"
                : "animate-slide-in-right"
            }`}
            style={{
              left: "50%",
              top: "50%",
              // Ensure proper mobile positioning and visibility
              transform: "translate(-50%, -50%)",
              // Force visibility on mobile
              visibility: "visible",
              opacity: 1,
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
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Close
                    </button>
                  </div>
                )
              }

              return (
                <>
                  <div className="memory-preview-header">
                    <div className="memory-preview-icon">💬</div>
                    <div className="memory-preview-title">Chat Messages</div>
                    <div className="flex items-center gap-2 ml-auto">
                      {previousNodeStats && (
                        <button
                          onClick={() => {
                            console.log("Going back to node stats")
                            setIsAnimatingBack(true)
                            setTimeout(() => {
                              setShowChatMessage(null)
                              if (previousNodeStats) {
                                setSelectedNodeForModal(previousNodeStats)
                              }
                              setIsAnimatingBack(false)
                            }, 300)
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Back to Memory Details"
                        >
                          <ArrowLeft size={16} className="text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowChatMessage(null)
                          // Clear any other modal states to prevent conflicts
                          setSelectedNodeForModal(null)
                          setSelectedKeySubject(null)
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Close"
                      >
                        <X size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="memory-preview-content">
                    <div className="space-y-6">
                      {/* User message */}
                      <ChatMessage
                        content={memory.prompt || "No prompt available"}
                        timestamp={memory.timestamp || new Date()}
                        isUser={true}
                        hideActions={{
                          delete: true,
                          memories: true,
                        }}
                        menuProps={{
                          id: memory.id,
                          onCopy: () => {
                            navigator.clipboard.writeText(memory.prompt || "")
                            toast.success("Copied to clipboard")
                          },
                          onDelete: () => {
                            // Handle delete if needed
                          },
                          onShowMemories: () => {
                            // Handle show memories if needed
                          },
                        }}
                      />

                      {/* Assistant message */}
                      <ChatMessage
                        content={memory.response || "No response available"}
                        timestamp={memory.timestamp || new Date()}
                        isUser={false}
                        hideActions={{
                          delete: true,
                          memories: true,
                        }}
                        menuProps={{
                          id: memory.id,
                          onCopy: () => {
                            navigator.clipboard.writeText(memory.response || "")
                            toast.success("Copied to clipboard")
                          },
                          onDelete: () => {
                            // Handle delete if needed
                          },
                          onShowMemories: () => {
                            // Handle show memories if needed
                          },
                        }}
                      />
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
          {/* Click outside to close */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setShowChatMessage(null)}
          />
        </>
      )}

      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full bg-background overflow-hidden"
        style={{ visibility: isReady ? "visible" : "hidden" }}
      />

      {/* Card View */}
      {viewMode === "cards" && (
        <div className="absolute inset-0 w-full h-full bg-background flex flex-col">
          {/* Card Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode("graph")}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Back to Graph View"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-lg font-semibold">Memory Cards</h2>
                <p className="text-sm text-muted-foreground">
                  {rankedMemories.length} memories ranked by relevance
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentCardIndex + 1} of {rankedMemories.length}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 flex items-center justify-center p-4">
            {rankedMemories.length > 0 ? (
              <div className="w-full max-w-2xl">
                {rankedMemories[currentCardIndex] && (
                  <div className="memory-preview-card w-full max-w-none">
                    {(() => {
                      const { memory, depth, rank, parentRank, childRank } =
                        rankedMemories[currentCardIndex]
                      const memoryType = getMemoryType(memory)
                      const details = pairDetails[memory.id]
                      const rankDisplay =
                        depth === 1 ? `#${rank}` : `#${parentRank}.${childRank}`

                      return (
                        <>
                          <div className="memory-preview-header">
                            <div className="flex items-center gap-3">
                              <div className="memory-preview-icon">
                                {memoryType.icon}
                              </div>
                              <div className="memory-preview-title">
                                {memoryType.type.toUpperCase()}
                              </div>
                              <div className="px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                                {rankDisplay}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                onClick={() => {
                                  // Clear any existing modals first to prevent z-index conflicts
                                  setSelectedNodeForModal(null)
                                  setSelectedKeySubject(null)

                                  // Set the chat message modal
                                  setShowChatMessage({
                                    memory,
                                    position: { x: 0, y: 0 },
                                  })
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title="Open Chat Message"
                              >
                                <MessageCircle
                                  size={16}
                                  className="text-blue-400"
                                />
                              </button>
                            </div>
                          </div>
                          <div className="memory-preview-content">
                            {(() => {
                              const promptHasImages = hasImages(
                                memory.prompt || ""
                              )
                              const responseHasImages = hasImages(
                                memory.response || ""
                              )

                              if (promptHasImages || responseHasImages) {
                                return (
                                  <div className="space-y-4">
                                    {memory.prompt && (
                                      <MarkdownRenderer
                                        content={memory.prompt}
                                        className="text-sm text-white/90"
                                      />
                                    )}
                                  </div>
                                )
                              }

                              return memory.prompt || "No content available"
                            })()}
                          </div>
                          {details && details.subjects.length > 0 && (
                            <>
                              <div className="text-sm font-medium text-white/80 mb-2">
                                Related Subjects ({details.subjects.length})
                              </div>
                              <div className="memory-preview-subjects">
                                {details.subjects.map(
                                  (subj: PairSubject, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`memory-preview-subject ${subj.is_key_subject ? "key-subject" : ""}`}
                                    >
                                      {subj.subject_text} ({subj.pair_count})
                                    </div>
                                  )
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Brain size={48} className="mx-auto mb-4 opacity-50" />
                <p>No memories found</p>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="p-4 border-t border-border">
            {/* Slider */}
            <div className="slider-container mb-6">
              <input
                type="range"
                min={0}
                max={Math.max(0, rankedMemories.length - 1)}
                value={currentCardIndex}
                onChange={(e) => setCurrentCardIndex(parseInt(e.target.value))}
                className="w-full slider"
              />
              <div className="slider-value">
                {rankedMemories[currentCardIndex]?.depth === 1
                  ? "L1 Memory"
                  : "L2 Memory"}{" "}
                #{currentCardIndex + 1}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() =>
                  setCurrentCardIndex(Math.max(0, currentCardIndex - 1))
                }
                disabled={currentCardIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <div className="text-sm text-muted-foreground">
                {rankedMemories[currentCardIndex]?.depth === 1
                  ? "L1 Memory"
                  : "L2 Memory"}
              </div>

              <button
                onClick={() =>
                  setCurrentCardIndex(
                    Math.min(rankedMemories.length - 1, currentCardIndex + 1)
                  )
                }
                disabled={currentCardIndex === rankedMemories.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

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
