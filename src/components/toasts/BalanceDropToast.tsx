import React from "react"
import { toast } from "sonner"
import "./BalanceDropToast.css"

interface BalanceDropToastProps {
  amount: string
  onDismiss?: () => void
}

const BalanceDropToast: React.FC<BalanceDropToastProps> = ({
  amount,
  onDismiss,
}) => {
  return (
    <div className="balance-drop-toast animate-enter">
      <div className="token-glow"></div>
      <span className="icon">💰</span>
      <span className="message">+{amount}</span>
      <button onClick={onDismiss} className="close-button">
        &times;
      </button>
    </div>
  )
}

// Helper function to show the toast
export const showBalanceDropToast = (amount: string) => {
  toast.custom(
    (id) => (
      <BalanceDropToast amount={amount} onDismiss={() => toast.dismiss(id)} />
    ),
    {
      duration: 5000,
      position: "top-center",
    }
  )
}

export default BalanceDropToast
