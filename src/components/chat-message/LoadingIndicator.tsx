import React from "react"

const LoadingIndicator: React.FC = () => (
  <div className="flex justify-center items-center py-2">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0ms]"></div>
      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:150ms]"></div>
      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:300ms]"></div>
    </div>
  </div>
)

export default LoadingIndicator
