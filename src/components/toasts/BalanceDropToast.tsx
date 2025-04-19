import React, { useEffect, useState } from "react"
import toast, { Toast } from "react-hot-toast"
import "./BalanceDropToast.css"

interface BalanceDropToastProps {
  t: Toast // Toast object from react-hot-toast
  amount: string
}

const BalanceDropToast: React.FC<BalanceDropToastProps> = ({ t, amount }) => {
  const [isVisible, setIsVisible] = useState(false)

  // Handle animation states
  useEffect(() => {
    // Set visible with a slight delay for better animation effect
    const timer = setTimeout(() => {
      setIsVisible(t.visible)
    }, 50)

    return () => clearTimeout(timer)
  }, [t.visible])

  // Combine classes for animations
  const containerClass = `balance-drop-toast ${isVisible ? "animate-enter" : "animate-leave"}`

  return (
    <div className={containerClass}>
      <div className="token-glow"></div>
      <span className="icon">💰</span>
      <span className="message">+{amount}</span>
      <button onClick={() => toast.dismiss(t.id)} className="close-button">
        &times;
      </button>
    </div>
  )
}

export default BalanceDropToast
