import React from "react"
import { Switch, FormControlLabel } from "@mui/material"
import "./SubscriptionToggle.css"

interface SubscriptionToggleProps {
  isYearly: boolean
  onChange: (isYearly: boolean) => void
}

const SubscriptionToggle: React.FC<SubscriptionToggleProps> = ({
  isYearly,
  onChange,
}) => {
  return (
    <div className="subscription-toggle-container">
      <div className="subscription-toggle-labels">
        <span className={!isYearly ? "active" : ""}>Monthly</span>
        <FormControlLabel
          control={
            <Switch
              checked={isYearly}
              onChange={(e) => onChange(e.target.checked)}
              color="primary"
            />
          }
          label={
            <div className="subscription-toggle-savings">Annual (Save 20%)</div>
          }
          labelPlacement="end"
        />
      </div>
    </div>
  )
}

export default SubscriptionToggle
