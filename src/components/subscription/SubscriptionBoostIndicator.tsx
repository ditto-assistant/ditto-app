import React from "react"
import { Tooltip } from "@mui/material"
import TokenIcon from "@/components/ui/icons/TokenIcon"
import "./SubscriptionBoostIndicator.css"

interface SubscriptionBoostIndicatorProps {
  isBoosted: boolean
}

const SubscriptionBoostIndicator: React.FC<SubscriptionBoostIndicatorProps> = ({
  isBoosted
}) => {
  if (!isBoosted) return null

  return (
    <Tooltip
      title="Your subscription tier is boosted by your token balance"
      arrow
      placement="top"
    >
      <div className="subscription-boost-indicator">
        <TokenIcon className="token-icon-boosted" size={18} />
        <span className="boost-text">Boosted</span>
      </div>
    </Tooltip>
  )
}

export default SubscriptionBoostIndicator
