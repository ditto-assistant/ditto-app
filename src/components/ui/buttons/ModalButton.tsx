import React from "react"
import { Button } from "@/components/ui/button"
import { Loader } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalButtonProps extends React.ComponentProps<typeof Button> {
  icon?: React.ReactNode
  isLoading?: boolean
  fullWidth?: boolean
  fixedWidth?: boolean
  children?: React.ReactNode
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  children,
  variant = "default",
  icon,
  isLoading,
  fullWidth,
  fixedWidth,
  size = "default",
  className = "",
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={isLoading || props.disabled}
      className={cn(
        fullWidth && "w-full",
        fixedWidth && "min-w-[150px]",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        icon && icon
      )}
      {children}
    </Button>
  )
}
