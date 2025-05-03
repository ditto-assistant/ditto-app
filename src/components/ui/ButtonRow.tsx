import React from "react"
import { cn } from "@/lib/utils"

const ButtonRow: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("button-row", className)} {...props}>
      {children}
    </div>
  )
}

export default ButtonRow
