import React from "react"
import { FaCoins } from "react-icons/fa"
import "./TokenIcon.css"

interface TokenIconProps {
  className?: string
  size?: number
  color?: string
}

const TokenIcon: React.FC<TokenIconProps> = ({
  className = "",
  size = 16,
  color
}) => {
  return (
    <div
      className={`token-icon-container ${className}`}
      style={{ fontSize: size }}
    >
      <FaCoins className="token-icon" style={color ? { color } : undefined} />
    </div>
  )
}

export default TokenIcon
