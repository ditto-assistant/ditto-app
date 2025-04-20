import React from "react"
import { cn } from "@/lib/utils"

interface ButtonRowProps extends React.HTMLAttributes<HTMLDivElement> {}

const ButtonRow: React.FC<ButtonRowProps> = ({
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
