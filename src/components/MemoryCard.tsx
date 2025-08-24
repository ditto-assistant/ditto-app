import React, { useState } from "react"
import { MessageCircle, ChevronDown, X } from "lucide-react"
import { Memory } from "@/api/getMemories"
import { ComprehensivePairDetails, PairSubject } from "@/api/kg"
import MarkdownRenderer from "@/components/MarkdownRenderer"

interface MemoryCardProps {
  memory: Memory
  details?: ComprehensivePairDetails
  memoryType: { icon: string; type: string }
  rankDisplay?: string
  showRank?: boolean
  showCloseButton?: boolean
  onClose?: () => void
  onShowChatMessage: (memory: Memory) => void
  className?: string
  variant?: "modal" | "card"
}

// Image detection in memory content
const hasImages = (content: string): boolean => {
  return content.includes("![") && content.includes("](") && content.includes(")")
}

const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  details,
  memoryType,
  rankDisplay,
  showRank = false,
  showCloseButton = false,
  onClose,
  onShowChatMessage,
  className = "",
  variant = "modal",
}) => {
  const [subjectsCollapsed, setSubjectsCollapsed] = useState(false)

  // Clean prompt text by replacing markdown image syntax with emoji
  const cleanPrompt = memory.prompt?.replace(/!\[[^\]]*\]\([^)]+\)/g, "🖼️") || ""
  const cleanResponse = memory.response?.replace(/!\[[^\]]*\]\([^)]+\)/g, "🖼️") || ""

  // Truncate content for overview
  const truncatedPrompt = cleanPrompt.length > 100 
    ? cleanPrompt.substring(0, 100) + "..." 
    : cleanPrompt
  const truncatedResponse = cleanResponse.length > 100 
    ? cleanResponse.substring(0, 100) + "..." 
    : cleanResponse

  return (
    <div className={`${variant === "card" ? "memory-card-view" : "memory-preview-card"} ${className}`}>
      <div className="memory-preview-header">
        <div className="flex items-center gap-3">
          <div className="memory-preview-icon">{memoryType.icon}</div>
          <div className="memory-preview-title">
            {memoryType.type.toUpperCase()}
          </div>
          {showRank && rankDisplay && (
            <div className="px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
              {rankDisplay}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onShowChatMessage(memory)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Show Full Thread"
          >
            <MessageCircle size={16} className="text-blue-400" />
          </button>
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X size={16} className="text-white/60" />
            </button>
          )}
        </div>
      </div>

      <div className="memory-preview-content">
        <div className="space-y-4">
          {/* Overview Section */}
          <div className="overview-section">
            <div className="text-sm font-medium text-white/80 mb-3">
              Overview
            </div>
            <div className="space-y-3">
              {memory.prompt && (
                <div className="overview-item">
                  <div className="text-xs text-white/60 mb-1">User Prompt:</div>
                  <div className="text-sm text-white/90 bg-white/5 p-3 rounded-lg border border-white/10">
                    {truncatedPrompt}
                  </div>
                </div>
              )}
              {memory.response && (
                <div className="overview-item">
                  <div className="text-xs text-white/60 mb-1">AI Response:</div>
                  <div className="text-sm text-white/90 bg-white/5 p-3 rounded-lg border border-white/10">
                    {truncatedResponse}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Show Full Thread Button */}
          <div className="show-full-thread-section">
            <button
              onClick={() => onShowChatMessage(memory)}
              className="w-full py-3 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <MessageCircle size={16} />
              <span className="font-medium">Show Full Thread</span>
            </button>
            <div className="text-xs text-white/50 text-center mt-2">
              View the complete conversation
            </div>
          </div>
        </div>
      </div>

      {/* Related Subjects */}
      {details && details.subjects.length > 0 && (
        <div className="subjects-section flex-shrink-0 mt-4">
          <button
            onClick={() => setSubjectsCollapsed(!subjectsCollapsed)}
            className="subjects-toggle flex items-center justify-between w-full text-sm font-medium text-white/80 mb-2 hover:text-white/90 transition-colors"
          >
            <span>Related Subjects ({details.subjects.length})</span>
            <ChevronDown 
              size={16} 
              className={`transition-transform ${subjectsCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
          <div className={`subjects-content ${subjectsCollapsed ? 'collapsed' : ''}`}>
            <div className="memory-preview-subjects">
              {details.subjects.map((subj: PairSubject, idx: number) => (
                <div
                  key={idx}
                  className={`memory-preview-subject ${subj.is_key_subject ? "key-subject" : ""}`}
                >
                  {subj.subject_text} ({subj.pair_count})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemoryCard 