import React, { useEffect, useState, useRef } from "react"
import { Trash, Eye } from "lucide-react"
import ChatMessage from "../chat-message/ChatMessage"
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion"
import { useMemoryNodeViewer } from "@/hooks/useMemoryNodeViewer"
import { Memory } from "@/api/getMemories"
import { formatDateTime } from "./utils"

interface TableViewProps {
  memories: Memory[]
}

const TableView: React.FC<TableViewProps> = ({ memories }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>()
    memories.forEach((_, index) => {
      initialExpanded.add(index.toString())
    })
    return initialExpanded
  })

  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { showMemoryNode } = useMemoryNodeViewer()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    if (memories.length > 0) {
      const rootNodes = new Set<string>()
      memories.forEach((_, index) => {
        rootNodes.add(index.toString())
      })
      setExpandedNodes(rootNodes)
    }
  }, [memories])

  const handleDelete = async (memory: Memory) => {
    if (!memory) return
    confirmMemoryDeletion(memory.id, { isMessage: false })
  }

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId)
      } else {
        newExpanded.add(nodeId)
      }
      return newExpanded
    })
  }

  const handleViewMemory = (memory: Memory) => {
    showMemoryNode(
      {
        ...memory,
        level: 0,
      },
      handleDelete
    )
  }

  const getMemoryTreeCount = (memory: Memory): number => {
    let count = 1
    if (memory.children && memory.children.length > 0) {
      memory.children.forEach((child) => {
        count += getMemoryTreeCount(child)
      })
    }
    return count
  }

  interface MemoryNodeProps {
    memory: Memory
    depth?: number
    index?: number
    parentPath?: string
  }

  const MemoryNode: React.FC<MemoryNodeProps> = ({
    memory,
    depth = 0,
    index = 0,
    parentPath = "",
  }) => {
    const nodePath = parentPath ? `${parentPath}-${index}` : `${index}`
    const isExpanded = expandedNodes.has(nodePath)
    const hasChildren = memory.children && memory.children.length > 0
    const childrenCount = hasChildren ? getMemoryTreeCount(memory) - 1 : 0

    return (
      <div
        className={`memory-node ${isExpanded ? "memory-node-expanded" : ""}`}
      >
        <div
          className="memory-node-header"
          onClick={() => toggleExpanded(nodePath)}
        >
          {depth > 0 && <div className="memory-node-connector" />}
          <div className="memory-node-info">
            <div className="memory-node-time">
              <span
                className={`memory-node-expand-icon ${hasChildren ? "has-children" : ""}`}
              >
                {hasChildren ? (isExpanded ? "▼" : "▶") : "○"}
              </span>
              {formatDateTime(memory.timestamp)}
              {hasChildren && (
                <span className="memory-children-count">
                  ({childrenCount} {childrenCount === 1 ? "child" : "children"})
                </span>
              )}
            </div>
            <div className="memory-node-actions">
              <button
                className="memory-view-button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewMemory(memory)
                }}
                title="View memory details"
              >
                <Eye />
              </button>
              <button
                className="memory-delete-button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(memory)
                }}
                title="Delete this memory"
              >
                <Trash />
              </button>
            </div>
          </div>
        </div>
        <div
          className={`memory-node-content ${isExpanded ? "expanded" : "collapsed"}`}
        >
          <div className="memory-node-messages">
            <ChatMessage
              content={memory.prompt}
              timestamp={
                memory.timestamp instanceof Date
                  ? memory.timestamp.getTime()
                  : Date.now()
              }
              isUser={true}
              menuProps={{
                id: memory.id,
                onCopy: () => navigator.clipboard.writeText(memory.prompt),
                onDelete: () => handleDelete(memory),
                onShowMemories: () => handleViewMemory(memory),
              }}
            />
            <ChatMessage
              content={memory.response}
              timestamp={
                memory.timestamp instanceof Date
                  ? memory.timestamp.getTime()
                  : Date.now()
              }
              isUser={false}
              menuProps={{
                id: memory.id,
                onCopy: () => navigator.clipboard.writeText(memory.response),
                onDelete: () => handleDelete(memory),
                onShowMemories: () => handleViewMemory(memory),
              }}
            />
          </div>
          {!isExpanded && <div className="memory-node-fade" />}
        </div>
        {isExpanded && hasChildren && (
          <div className="memory-children-container">
            {memory.children?.map((child, childIndex) => (
              <MemoryNode
                key={`${nodePath}-${childIndex}`}
                memory={child}
                depth={depth + 1}
                index={childIndex}
                parentPath={nodePath}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="memory-table">
      {memories.length === 0 ? (
        <div className="memory-empty-state">
          No memories found. Chat with Ditto to create memories.
        </div>
      ) : (
        memories.map((memory, index) => (
          <MemoryNode key={index} memory={memory} index={index} />
        ))
      )}
    </div>
  )
}

export default TableView
