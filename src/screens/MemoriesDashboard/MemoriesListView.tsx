import React from "react"
import { Memory } from "@/api/getMemories"
import ChatMessage from "@/components/ChatMessage"

interface MemoriesListViewProps {
  memories: (Memory & { level?: number })[] // Updated to include the level property
  onCopy: (memory: Memory, type: "prompt" | "response") => void
  onDelete: (memory: Memory) => void
  onShowMemories: (memory: Memory) => void
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
        console.log(`Memory ${idx} vector_distance: ${memory.vector_distance}, similarity: ${memory.similarity}, score: ${memory.score}`)

        // Calculate match percentage - handle both regular memories and KG pairs
        let matchPercentage: string
        if (memory.similarity !== undefined) {
          // For KG pairs, similarity is the similarity score (higher is better)
          matchPercentage = (memory.similarity * 100).toFixed(1)
        } else if (memory.score !== undefined) {
          // Alternative similarity field, also higher is better
          matchPercentage = (memory.score * 100).toFixed(1)
        } else if (memory.vector_distance !== undefined) {
          // For regular memories, vector_distance is a similarity score.
          // For KG pairs, this would be (1 - similarity), so we prefer similarity/score fields first.
          matchPercentage = (memory.vector_distance * 100).toFixed(1)
        } else {
          matchPercentage = "0.0"
        }
        
        const levelInfo = memory.level ? `Level: ${memory.level}` : ""
        const metadataFooter = `\n\n---\n*${matchPercentage}% Match${levelInfo ? " • " + levelInfo : ""}*`
        const timestamp =
          memory.timestamp instanceof Date
            ? memory.timestamp
            : new Date(memory.timestamp)

        return (
          <div
            key={`${memory.id}-${idx}`}
            className={`flex flex-col gap-1 p-4 rounded-xl bg-muted/50 border border-border 
              transition-transform hover:-translate-y-0.5 hover:shadow-lg ${
                memory.level && memory.level > 1
                  ? `ml-${Math.min((memory.level - 1) * 4, 16)}`
                  : ""
              } ${
                memory.level === 1
                  ? "border-primary/50 bg-primary/5"
                  : memory.level === 2
                    ? "border-secondary/50 bg-secondary/5"
                    : "border-muted"
              }`}
          >
            {memory.level && memory.level > 1 && (
              <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-full bg-muted"></span>
                <span>Level {memory.level} connection</span>
              </div>
            )}
            {/* User/prompt message */}
            <ChatMessage
              content={memory.prompt}
              timestamp={timestamp}
              isUser={true}
              menuProps={{
                onCopy: () => onCopy(memory, "prompt"),
                onDelete: () => onDelete(memory),
                onShowMemories: () => onShowMemories(memory),
              }}
            />

            {/* Assistant/response message with metadata */}
            <ChatMessage
              content={memory.response + metadataFooter}
              timestamp={timestamp}
              isUser={false}
              menuProps={{
                onCopy: () => onCopy(memory, "response"),
                onDelete: () => onDelete(memory),
                onShowMemories: () => onShowMemories(memory),
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default MemoriesListView
