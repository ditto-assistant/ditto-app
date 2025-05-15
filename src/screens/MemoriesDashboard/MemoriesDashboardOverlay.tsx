import React, { useState, useEffect, useRef } from "react"
import { Search, List, Network } from "lucide-react"
import { getMemories, Memory } from "@/api/getMemories"
import { useAuth } from "@/hooks/useAuth"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import Modal from "@/components/ui/modals/Modal"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModalId } from "@/hooks/useModal"

import "./MemoriesDashboardOverlay.css"

// Simplified SearchBar component
function SearchBar({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
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
const MemoryCard = ({ memory }: { memory: Memory }) => {
  return (
    <div className="memory-card">
      <div className="memory-card-header">
        <div className="memory-prompt">{memory.prompt}</div>
        <div className="memory-timestamp">
          {new Date(memory.timestamp).toLocaleDateString()}
        </div>
      </div>
      <div className="memory-response">{memory.response}</div>
      <div className="memory-metadata">
        <span className="memory-score">Score: {memory.score.toFixed(2)}</span>
        <span className="memory-distance">Distance: {memory.vector_distance.toFixed(2)}</span>
      </div>
    </div>
  )
}

// Network visualization component
const MemoryNetwork = ({ memories }: { memories: Memory[] }) => {
  const networkRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // A placeholder for network visualization
    // In a real implementation, you'd use a library like D3.js or vis.js here
    const renderNetwork = () => {
      if (!networkRef.current || !memories.length) return
      
      // Simple placeholder visualization logic
      const container = networkRef.current
      container.innerHTML = ''
      
      const centerNode = document.createElement('div')
      centerNode.className = 'network-node center-node'
      centerNode.textContent = 'Query'
      container.appendChild(centerNode)
      
      memories.forEach((memory, index) => {
        const node = document.createElement('div')
        node.className = 'network-node'
        node.textContent = `${index + 1}`
        node.style.setProperty('--angle', `${(index * (360 / memories.length))}deg`)
        node.style.setProperty('--distance', `${100 + memory.depth * 30}px`)
        
        const tooltip = document.createElement('div')
        tooltip.className = 'node-tooltip'
        tooltip.textContent = memory.prompt.substring(0, 50) + (memory.prompt.length > 50 ? '...' : '')
        node.appendChild(tooltip)
        
        container.appendChild(node)
        
        const edge = document.createElement('div')
        edge.className = 'network-edge'
        edge.style.setProperty('--angle', `${(index * (360 / memories.length))}deg`)
        edge.style.setProperty('--distance', `${100 + memory.depth * 30}px`)
        container.appendChild(edge)
      })
    }
    
    renderNetwork()
  }, [memories])

  return (
    <div className="memory-network">
      <div className="network-visualization" ref={networkRef}></div>
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

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    
    try {
      const userID = user?.uid
      if (!userID) {
        throw new Error("User not authenticated")
      }
      
      if (!preferences) {
        throw new Error("Model preferences not available")
      }
      
      // This is a placeholder - in a real implementation you'd use a 
      // memory search endpoint with the search term
      const memoriesResponse = await getMemories({
        userID,
        longTerm: {
          pairID: searchTerm, // Using searchTerm as a mock pairID
          nodeCounts: preferences.memory.longTermMemoryChain,
        },
        stripImages: false,
      }, "application/json")
      
      if (memoriesResponse.err) {
        throw new Error(memoriesResponse.err)
      }
      
      if (!memoriesResponse.ok || !memoriesResponse.ok.longTerm) {
        throw new Error("Failed to fetch memories")
      }
      
      setMemories(memoriesResponse.ok.longTerm)
    } catch (error) {
      console.error("Error searching memories:", error)
      // You could add a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
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
          {loading ? (
            <div className="loading-indicator">Searching memories...</div>
          ) : (
            <>
              {memories.length === 0 ? (
                <div className="no-memories">
                  <p>No memories found. Try a different search term.</p>
                </div>
              ) : (
                <>
                  {activeView === "list" ? (
                    <div className="memories-list">
                      {memories.map((memory) => (
                        <MemoryCard key={memory.id} memory={memory} />
                      ))}
                    </div>
                  ) : (
                    <MemoryNetwork memories={memories} />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
} 