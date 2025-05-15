import React, { useState, useEffect, useRef, useCallback } from "react"
import { Search, List, Network, Info, X } from "lucide-react"
import { getMemories, Memory } from "@/api/getMemories"
import { embed } from "@/api/embed"
import { useAuth } from "@/hooks/useAuth"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { usePlatform } from "@/hooks/usePlatform"
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
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
import ChatMessage from "@/components/ChatMessage"
import "./MemoriesDashboardOverlay.css"

// Global cache of node positions to preserve layout across modal instances
const persistedNodePositions: Record<string, { x: number; y: number }> = {}

// Simplified SearchBar component
function SearchBar({
  searchTerm,
  onSearchChange,
  onSearch,
}: {
  searchTerm: string
  onSearchChange: (value: string) => void
  onSearch: () => void
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch()
    }
  }

  return (
    <div className="memories-search-bar">
      <div className="search-input-container">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search your memories..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
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
  const [isOpeningNode, setIsOpeningNode] = useState(false)
  const { isMobile } = usePlatform()

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

    if (containerRef.current) {
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
          font: { color: "#fff", size: 12, face: "Arial" },
        },
        edges: {
          smooth: { enabled: true, type: "dynamic", roundness: 0.5 },
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
        networkRef.current.setOptions(options)
      } else {
        networkRef.current = new VisNetwork(
          containerRef.current,
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

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current)
      }

      if (networkRef.current && memories.length > 0) {
        networkRef.current.stabilize(200)
      }

      // Disable touch gestures on mobile for the container
      if (isMobile && containerRef.current) {
        containerRef.current.style.touchAction = "none"
        // Add event listeners to prevent default touch behavior
        containerRef.current.addEventListener("touchstart", preventTouch, {
          passive: false,
        })
        containerRef.current.addEventListener("touchmove", preventTouch, {
          passive: false,
        })

        return () => {
          // Clean up event listeners
          if (containerRef.current) {
            containerRef.current.removeEventListener("touchstart", preventTouch)
            containerRef.current.removeEventListener("touchmove", preventTouch)
          }

          // Cleanup resize observer
          if (containerRef.current) {
            resizeObserver.unobserve(containerRef.current)
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
      {!isReady && memories.length > 0 && !isOpeningNode && (
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
  const [isViewingNode, setIsViewingNode] = useState(false) // Add this to track when a node is being viewed
  const { showMemoryNode: originalShowMemoryNode } = useMemoryNodeViewer() // Get showMemoryNode here
  const { confirmMemoryDeletion } = useMemoryDeletion() // Add this hook for memory deletion
  const { showMemoryNetwork } = useMemoryNetwork() // Add this hook for showing memory network

  // Refs to track fit operations
  const isFittingRef = useRef<boolean>(false)
  const fitTimeoutRef = useRef<number | null>(null)

  // Memoize the showMemoryNode function to prevent unnecessary re-renders
  const showMemoryNode = useCallback(
    (memory: MemoryWithLevel) => {
      setIsViewingNode(true)
      originalShowMemoryNode(memory)
    },
    [originalShowMemoryNode]
  )

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
    // Sort by vector_distance descending (higher distance = higher match percentage now)
    return flatMemories.sort((a, b) => b.vector_distance - a.vector_distance)
  }

  const listViewMemories = getListViewMemories()

  // Callbacks for memory card interactions
  const handleCopy = useCallback(
    (memory: Memory, type: "prompt" | "response") => {
      const contentToCopy = type === "prompt" ? memory.prompt : memory.response
      if (!contentToCopy) {
        toast.error("No content to copy")
        return
      }

      navigator.clipboard.writeText(contentToCopy).then(
        () => {
          toast.success("Copied to clipboard")
        },
        (err) => {
          console.error("Could not copy text: ", err)
          toast.error("Failed to copy text")
        }
      )
    },
    []
  )

  // Update delete function to use confirmMemoryDeletion
  const handleDelete = useCallback(
    (memory: Memory) => {
      if (!memory.id) {
        toast.error("Cannot delete: Missing ID")
        return
      }

      // Use confirmMemoryDeletion to properly delete the memory
      confirmMemoryDeletion(memory.id, {
        isMessage: true, // Treat it like a message for consistent behavior
        onSuccess: () => {
          // Remove the deleted memory from the local state
          setMemories((prevMemories) => {
            // Function to recursively filter out the deleted memory
            const removeMemory = (mems: Memory[]): Memory[] => {
              return mems.filter((mem) => {
                if (mem.id === memory.id) return false
                if (mem.children && mem.children.length > 0) {
                  mem.children = removeMemory(mem.children)
                }
                return true
              })
            }

            // Create a fresh copy with the deleted memory removed
            return removeMemory([...prevMemories])
          })

          toast.success("Memory deleted successfully")
        },
      })
    },
    [confirmMemoryDeletion]
  )

  // Update showMemories function to use showMemoryNetwork from the hook
  const handleShowMemories = useCallback(
    (memory: Memory) => {
      // Use the showMemoryNetwork function from the hook
      showMemoryNetwork(memory)
    },
    [showMemoryNetwork]
  )

  return (
    <Modal id="memories" title="Memory Dashboard">
      <div className="memories-dashboard">
        <div className="memories-header">
          <div className="search-container">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onSearch={handleSearch}
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
        <div className="memories-content">
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
                No memories found for &quot;{lastSearchedTerm}&quot;. Try a
                different search.
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
                  {listViewMemories.map((memory, idx) => {
                    // Format metadata to include in the message
                    const matchPercentage = (
                      memory.vector_distance * 100
                    ).toFixed(1)
                    const metadataFooter = `\n\n---\n*${matchPercentage}% Match*`
                    const timestamp =
                      memory.timestamp instanceof Date
                        ? memory.timestamp
                        : new Date(memory.timestamp)

                    return (
                      <div key={`${memory.id}-${idx}`} className="memory-item">
                        {/* User/prompt message */}
                        <ChatMessage
                          content={memory.prompt}
                          timestamp={timestamp}
                          isUser={true}
                          menuProps={{
                            onCopy: () => handleCopy(memory, "prompt"),
                            onDelete: () => handleDelete(memory),
                            onShowMemories: () => handleShowMemories(memory),
                          }}
                        />

                        {/* Assistant/response message with metadata */}
                        <ChatMessage
                          content={memory.response + metadataFooter}
                          timestamp={timestamp}
                          isUser={false}
                          menuProps={{
                            onCopy: () => handleCopy(memory, "response"),
                            onDelete: () => handleDelete(memory),
                            onShowMemories: () => handleShowMemories(memory),
                          }}
                        />
                      </div>
                    )
                  })}
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
