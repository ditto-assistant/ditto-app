import React from "react"
import { toolLabels } from "@/lib/toolUtils"

interface ToolLabelProps {
  toolType: string
}

const ToolLabel: React.FC<ToolLabelProps> = ({ toolType }) => {
  const tool = toolLabels[toolType]
  if (!tool) return null

  return (
    <div
      className="absolute -top-1.5 left-3 px-2 py-0.5 text-xs font-bold rounded-full text-white z-10"
      style={{ backgroundColor: tool.color }}
    >
      {tool.text}
    </div>
  )
}

export default ToolLabel
