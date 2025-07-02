import React from "react"
import ChatMessage from "@/components/ChatMessage"
import { Pair } from "@/types/common"
import { Memory } from "@/api/getMemories"

interface MemoriesListViewProps {
  memories: (Pair & { level?: number })[] // Updated to include the level property
  onCopy: (memory: Memory, type: "prompt" | "response") => void
  onDelete: (memory: Memory) => void
  onShowMemories: (memory: Memory) => void
}

function pairToMemory(pair: Pair): Memory {
  return {
    ...pair,
    prompt: pair.prompt ?? "",
    response: pair.response ?? "",
    score: pair.score ?? 0,
    vector_distance: pair.vector_distance ?? 0,
    similarity: pair.similarity ?? 0,
    depth: pair.depth ?? 0,
    timestamp: pair.timestamp ?? new Date(),
  }
}

const MemoriesListView: React.FC<MemoriesListViewProps> = ({
  memories,
  onCopy,
  onDelete,
  onShowMemories,
}) => {
  return (
    <div className="flex flex-col gap-6 flex-1 overflow-y-auto max-w-full px-4">
      {memories.map((memory, idx) => {
        // Format metadata to include in the message
        // Debug check for vector_distance ranges
        console.log(
          `Memory ${idx} vector_distance: ${memory.vector_distance}, similarity: ${memory.similarity}, score: ${memory.score}`
        )

        // Calculate match percentage - handle both regular memories and KG pairs
        let matchPercentage: string
        let showMatchPercentage = true

        // For KG results, prioritize 'similarity' field
        // For regular memory search, use 'score' or 'vector_distance' field
        if (memory.similarity !== undefined) {
          // For KG pairs, similarity is the similarity score (higher is better)
          matchPercentage = (memory.similarity * 100).toFixed(1)
          // Don't show match percentage for recent pairs (similarity = 1.0 exactly indicates no search performed)
          showMatchPercentage = memory.similarity !== 1.0
        } else if (memory.score !== undefined && memory.score > 0) {
          // Regular memory search - score contains actual similarity values, always show
          matchPercentage = (memory.score * 100).toFixed(1)
          showMatchPercentage = true
        } else if (memory.vector_distance !== undefined) {
          // For regular memories, vector_distance contains the actual similarity score
          matchPercentage = (memory.vector_distance * 100).toFixed(1)
        } else {
          matchPercentage = "0.0"
          showMatchPercentage = false
        }

        const levelInfo = memory.level ? `Level: ${memory.level}` : ""
        const metadataFooter = showMatchPercentage
          ? `\n\n---\n*${matchPercentage}% Match${levelInfo ? " • " + levelInfo : ""}*`
          : levelInfo
            ? `\n\n---\n*${levelInfo}*`
            : ""
        const timestamp = memory.timestamp ?? new Date()

        return (
          <div
            key={`${memory.id}-${idx}`}
            className={`flex flex-col gap-1 p-4 rounded-xl glass-card-light 
              transition-transform hover:-translate-y-0.5 ${
                memory.level && memory.level > 1
                  ? `ml-${Math.min((memory.level - 1) * 4, 16)}`
                  : ""
              } ${
                memory.level === 1
                  ? "border-ditto-glass-border-strong"
                  : memory.level === 2
                    ? "border-ditto-glass-border"
                    : "border-ditto-glass-border"
              }`}
          >
            {memory.level && memory.level > 1 && (
              <div className="flex items-center gap-1 mb-1 text-xs text-ditto-secondary">
                <span className="inline-block w-3 h-3 rounded-full bg-ditto-glass-highlight"></span>
                <span>Level {memory.level} connection</span>
              </div>
            )}
            {/* User/prompt message */}
            <ChatMessage
              content={memory.prompt ?? ""}
              timestamp={timestamp}
              isUser={true}
              menuProps={{
                id: memory.id,
                onCopy: () => onCopy(pairToMemory(memory), "prompt"),
                onDelete: () => onDelete(pairToMemory(memory)),
                onShowMemories: () => onShowMemories(pairToMemory(memory)),
              }}
            />

            {/* Assistant/response message with metadata */}
            <ChatMessage
              content={memory.response + metadataFooter}
              timestamp={timestamp}
              isUser={false}
              menuProps={{
                id: memory.id,
                onCopy: () => onCopy(pairToMemory(memory), "response"),
                onDelete: () => onDelete(pairToMemory(memory)),
                onShowMemories: () => onShowMemories(pairToMemory(memory)),
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default MemoriesListView
