import React from "react"
import { Memory } from "@/api/getMemories"
import ChatMessage from "@/components/ChatMessage"

interface MemoriesListViewProps {
  memories: Memory[] // This will be the flattened and sorted listViewMemories
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
    <div className="flex flex-col gap-6 p-4 overflow-y-auto max-w-full">
      {memories.map((memory, idx) => {
        // Format metadata to include in the message
        // Debug check for vector_distance ranges
        console.log(`Memory ${idx} vector_distance: ${memory.vector_distance}`)

        // Direct calculation - vector_distance is already a similarity score (1 = exact match)
        const matchPercentage = (memory.vector_distance * 100).toFixed(1)
        const metadataFooter = `\n\n---\n*${matchPercentage}% Match*`
        const timestamp =
          memory.timestamp instanceof Date
            ? memory.timestamp
            : new Date(memory.timestamp)

        return (
          <div
            key={`${memory.id}-${idx}`}
            className="flex flex-col gap-1 p-4 rounded-xl bg-muted/50 border border-border transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
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
