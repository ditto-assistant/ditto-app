import React from "react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import TokenIcon from "@/components/ui/icons/TokenIcon"
import { cn } from "@/lib/utils"

interface SubscriptionBoostIndicatorProps {
  isBoosted: boolean
  className?: string
}

const SubscriptionBoostIndicator: React.FC<SubscriptionBoostIndicatorProps> = ({
  isBoosted,
  className,
}) => {
  if (!isBoosted) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1 text-amber-500 text-xs font-medium",
            className
          )}
        >
          <TokenIcon className="text-amber-500" size={18} />
          <span>Boosted</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Your subscription tier is boosted by your token balance
      </TooltipContent>
    </Tooltip>
  )
}

export default SubscriptionBoostIndicator
