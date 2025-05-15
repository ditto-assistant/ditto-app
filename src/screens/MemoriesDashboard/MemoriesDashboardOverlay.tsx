import React, { useState, useEffect, useRef } from "react"
import { Search, List, Network, Info, X } from "lucide-react"
import { getMemories, Memory } from "@/api/getMemories"
import { embed } from "@/api/embed"
import { useAuth } from "@/hooks/useAuth"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { DataSet } from "vis-data"
import {
  Network as VisNetwork,
  Node,
  Edge,
  Options,
  FitOptions,
} from "vis-network"
import {
  useMemoryNodeViewer,
  MemoryWithLevel,
} from "@/hooks/useMemoryNodeViewer"
import "./MemoriesDashboardOverlay.css"

// Global cache of node positions to preserve layout across modal instances
const persistedNodePositions: Record<string, { x: number; y: number }> = {}

// Simplified SearchBar component
function SearchBar({
  searchTerm,
  onSearchChange,
}: {
  searchTerm: string
  onSearchChange: (value: string) => void
}) {
  return (
    <div className="memories-search-bar">
      <div className="search-input-container">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search your memories..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>
    </div>
  )
}

// Memory card component for list view
interface MemoryCardProps {
  memory: Memory
  onCardClick: (memory: MemoryWithLevel) => void
}

const MemoryCard = ({ memory, onCardClick }: MemoryCardProps) => {
  const date =
    memory.timestamp instanceof Date
      ? memory.timestamp
      : new Date(memory.timestamp)

  // Score is 1 - distance, so higher is better. Max score displayed as 100%.
  const scorePercentage = ((1 - memory.vector_distance) * 100).toFixed(1)

  return (
    <div
      className="memory-card"
      onClick={() => onCardClick(memory as MemoryWithLevel)}
    >
      <div className="memory-card-header">
        <div className="memory-prompt">{memory.prompt}</div>
        <div className="memory-timestamp">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </div>
      </div>
      <div className="memory-response">{memory.response}</div>
      <div className="memory-metadata">
        <span className="memory-score">Similarity: {scorePercentage}%</span>
      </div>
    </div>
  )
}

// Helper function to flatten memories for the list view
const flattenMemoriesForList = (memoryList: Memory[]): Memory[] => {
  let flatList: Memory[] = []
  const dive = (mems: Memory[]) => {
    for (const mem of mems) {
      flatList.push({ ...mem, children: undefined }) // Add memory without children to avoid re-flattening if structure is inconsistent
      if (mem.children && mem.children.length > 0) {
        dive(mem.children)
      }
    }
  }
  dive(memoryList)
  return flatList
}

// Enhanced Network visualization component using vis-network
const MemoriesNetworkGraph = ({
  memories,
  searchQuery,
}: {
  memories: Memory[]
  searchQuery: string
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

  useEffect(() => {
    const nodes = new DataSet<Node>()
    const edges = new DataSet<Edge>()
    memoryMapRef.current.clear()
    setIsReady(false) // Reset ready state when memories change

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

    if (containerRef.current) {
      const fitOptions: FitOptions = {
        nodes: nodes.getIds(),
        animation: false, // Fit instantly after stabilization
        // padding: { top: 20, right: 20, bottom: 20, left: 20 } // Optional: add padding
      }

      const options: Options = {
        layout: {
          hierarchical: false, // Prefer physics-based layout for this structure
        },
        physics: {
          enabled: true,
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -60, // Adjusted for better spread with central node
            centralGravity: 0.01,
            springLength: 120, // Adjusted for better spread
            springConstant: 0.08,
            damping: 0.5,
            avoidOverlap: 0.9,
          },
          stabilization: { iterations: 200, fit: true }, // Longer stabilization
        },
        interaction: {
          dragNodes: true,
          menuMobile: true,
          tooltipDelay: 200,
          hover: true,
        },
        nodes: {
          borderWidth: 2,
          font: { color: "#fff", size: 12, face: "Arial" },
        },
        edges: {
          smooth: { enabled: true, type: "dynamic", roundness: 0.5 }, // dynamic for physics, added roundness
          color: {
            color: "#848484",
            highlight: "#ADD8E6",
            hover: "#ADD8E6",
            inherit: "from",
            opacity: 0.6,
          },
        },
      }

      if (networkRef.current) {
        networkRef.current.setData({ nodes, edges })
      } else {
        networkRef.current = new VisNetwork(
          containerRef.current,
          { nodes, edges },
          options
        )

        networkRef.current.on("click", (params) => {
          if (params.nodes.length > 0) {
            const clickedNodeId = params.nodes[0] as string
            const clickedItem = memoryMapRef.current.get(clickedNodeId)
            if (
              clickedItem &&
              !("isQueryNode" in clickedItem && clickedItem.isQueryNode)
            ) {
              const clickedMemory = clickedItem as Memory
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
            }
          }
        })
      }

      const handleFit = () => {
        if (networkRef.current && nodes.length > 0) {
          networkRef.current.fit(fitOptions)
        }
      }

      networkRef.current.once("stabilizationIterationsDone", () => {
        setIsReady(true)
        handleFit()
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

      if (networkRef.current && memories.length > 0) {
        networkRef.current.stabilize()
      }
      // Fallback fit if stabilization event doesn't fire as expected or for updates
      if (isReady && memories.length > 0) {
        setTimeout(handleFit, 100) // Short delay to allow DOM updates
      }
    }
    return () => {
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
  }, [memories, searchQuery, showMemoryNode, isReady]) // Added isReady to dependency array

  useEffect(() => {
    // Attempt to fit again when isReady becomes true, if memories are present
    if (
      isReady &&
      networkRef.current &&
      nodesDatasetRef.current &&
      nodesDatasetRef.current.length > 0
    ) {
      const fitOptions: FitOptions = {
        nodes: nodesDatasetRef.current.getIds(),
        animation: false,
      }
      networkRef.current.fit(fitOptions)
    }
  }, [isReady])

  // Show placeholder or loading only if memories are being fetched or network is building
  if (
    memories.length === 0 &&
    !isReady &&
    containerRef.current?.parentElement?.style.display !== "none"
  ) {
    return (
      <div className="no-memories">
        <Info size={24} />
        <p>Search to visualize your memory network.</p>
      </div>
    )
  }

  return (
    <div className="memory-network-container">
      <div
        ref={containerRef}
        className="network-visualization-area"
        style={{ visibility: isReady ? "visible" : "hidden" }}
      />
      {!isReady && memories.length > 0 && (
        <div className="loading-indicator">Building network...</div>
      )}
    </div>
  )
}

export default function MemoriesDashboardOverlay() {
  const [searchTerm, setSearchTerm] = useState("")
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<"list" | "network">("list")
  const { user } = useAuth()
  const { preferences } = useModelPreferences()
  const [error, setError] = useState<string | null>(null)
  const [lastSearchedTerm, setLastSearchedTerm] = useState("") // To pass to graph
  const { showMemoryNode } = useMemoryNodeViewer() // Get showMemoryNode here

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term")
      return
    }

    setLoading(true)
    setError(null)
    setMemories([])
    setLastSearchedTerm(searchTerm) // Store the search term for the graph title

    try {
      const userID = user?.uid
      if (!userID) throw new Error("User not authenticated")
      if (!preferences) throw new Error("Model preferences not available")

      const embeddingResult = await embed({
        userID,
        text: searchTerm,
        model: "text-embedding-005",
      })

      if (embeddingResult.err)
        throw new Error(`Embedding failed: ${embeddingResult.err}`)
      if (!embeddingResult.ok) throw new Error("Embedding failed: No result")

      const memoriesResponse = await getMemories(
        {
          userID,
          longTerm: {
            vector: embeddingResult.ok,
            nodeCounts: preferences.memory.longTermMemoryChain,
          },
          stripImages: false,
        },
        "application/json"
      )

      if (memoriesResponse.err) throw new Error(memoriesResponse.err)
      if (!memoriesResponse.ok || !memoriesResponse.ok.longTerm) {
        setMemories([])
        throw new Error("No memories found or query failed.")
      }

      // The API returns a tree structure, store it directly for the graph
      const resultsTree = memoriesResponse.ok.longTerm
      setMemories(resultsTree)

      if (resultsTree.length === 0) {
        setError("No memories found matching your search term.")
      }
    } catch (err) {
      const e = err as Error
      console.error("Error searching memories:", e)
      setError(e.message)
      toast.error(`Search failed: ${e.message}`)
      setMemories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  // Prepare data for list view by flattening and sorting
  const getListViewMemories = () => {
    if (!memories || memories.length === 0) return []
    const flatMemories = flattenMemoriesForList(memories)
    // Sort by vector_distance ascending (lower distance = higher similarity)
    return flatMemories.sort((a, b) => a.vector_distance - b.vector_distance)
  }

  const listViewMemories = getListViewMemories()

  // Callback for MemoryCard click
  const handleMemoryCardClick = (memory: MemoryWithLevel) => {
    showMemoryNode(memory)
  }

  return (
    <Modal id="memories" title="Memory Dashboard">
      <div className="memories-dashboard">
        <div className="memories-header">
          <div className="search-container">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchTerm.trim()}
              className="search-button"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
          <div className="view-toggle">
            <Button
              variant={activeView === "list" ? "default" : "outline"}
              onClick={() => setActiveView("list")}
              className="view-button"
            >
              <List size={18} />
              <span>List</span>
            </Button>
            <Button
              variant={activeView === "network" ? "default" : "outline"}
              onClick={() => setActiveView("network")}
              className="view-button"
            >
              <Network size={18} />
              <span>Network</span>
            </Button>
          </div>
        </div>
        <div className="memories-content" onKeyDown={handleKeyDown}>
          {loading && (
            <div className="loading-indicator">Searching memories...</div>
          )}
          {!loading && error && (
            <div className="error-message">
              <div className="error-icon">
                <X size={20} />
              </div>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && memories.length === 0 && searchTerm && (
            <div className="no-memories">
              <Info size={24} />
              <p>
                No memories found for &quot;{lastSearchedTerm}&quot;. Try a different
                search.
              </p>
            </div>
          )}
          {!loading && !error && memories.length === 0 && !searchTerm && (
            <div className="no-memories">
              <Info size={24} />
              <p>Enter a search term and click Search to find your memories.</p>
            </div>
          )}

          {!loading && !error && memories.length > 0 && (
            <>
              {activeView === "list" ? (
                <div className="memories-list">
                  {listViewMemories.map((memory, idx) => (
                    <MemoryCard
                      key={`${memory.id}-${idx}`}
                      memory={memory}
                      onCardClick={handleMemoryCardClick}
                    />
                  ))}
                </div>
              ) : (
                <MemoriesNetworkGraph
                  memories={memories}
                  searchQuery={lastSearchedTerm}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
