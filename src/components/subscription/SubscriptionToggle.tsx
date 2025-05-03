import React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

interface SubscriptionToggleProps {
  isYearly: boolean
  onChange: (isYearly: boolean) => void
  className?: string
}

const SubscriptionToggle: React.FC<SubscriptionToggleProps> = ({
  isYearly,
  onChange,
  className,
}) => {
  return (
    <div
      className={cn("flex items-center justify-center space-x-4", className)}
    >
      <span
        className={cn("text-sm", !isYearly && "font-semibold text-primary")}
      >
        Monthly
      </span>

      <div className="flex items-center space-x-2">
        <Switch
          checked={isYearly}
          onCheckedChange={onChange}
          id="subscription-toggle"
        />
        <Label
          htmlFor="subscription-toggle"
          className={cn(
            "text-sm cursor-pointer",
            isYearly && "font-semibold text-primary"
          )}
        >
          Annual (Save 20%)
        </Label>
      </div>
    </div>
  )
}

export default SubscriptionToggle
