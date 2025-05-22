import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useBalance } from "@/hooks/useBalance"
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner"
import { CheckoutForm } from "@/components/CheckoutForm"
import Modal from "@/components/ui/modals/Modal"
import { useModal } from "@/hooks/useModal"
import "./TokenModal.css"
import { CheckCircle, Coins } from "lucide-react"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import ModelPreferencesSelectors from "@/components/ModelPreferencesSelectors"
import { cn } from "@/lib/utils"
import {
  HapticPattern,
  VibrationPatterns,
  triggerHaptic,
} from "@/utils/haptics"

const PricingTiers = [
  { price: 5, tokens: "5B", bonus: "0%" },
  { price: 10, tokens: "11B", bonus: "10%" },
  { price: 25, tokens: "30B", bonus: "20%" },
  { price: 75, tokens: "100B", bonus: "33%" },
  { price: 100, tokens: "150B", bonus: "50%" },
]

export default function TokenModal() {
  const { createCloseHandler } = useModal()
  const closeModal = createCloseHandler("tokenCheckout")
  const balance = useBalance()
  const [amount, setAmount] = useState(10)
  const [showSuccess, setShowSuccess] = useState(false)
  const {
    preferences,
    updatePreferences,
    isLoading: preferencesLoading,
  } = useModelPreferences()

  useEffect(() => {
    // Check if we should show the success screen
    const tokenSuccess = window.sessionStorage.getItem("token_success")
    if (tokenSuccess === "true") {
      setShowSuccess(true)
      // Play success haptic feedback
      triggerHaptic(VibrationPatterns.Success)
      // Clear the flag
      window.sessionStorage.removeItem("token_success")
    }
  }, [])

  const handleAmountChange = (value: number | string) => {
    const newAmount = Math.max(1, Number(value))
    // Provide haptic feedback when selecting a pricing tier
    triggerHaptic(HapticPattern.Light)
    setAmount(newAmount)
  }

  if (showSuccess) {
    // Token purchase success view
    if (balance.isLoading || preferencesLoading || !preferences) {
      return (
        <Modal id="tokenCheckout" title="Purchase Successful">
          <div className="token-modal-loading">
            <LoadingSpinner size={45} />
          </div>
        </Modal>
      )
    }

    return (
      <Modal id="tokenCheckout" title="Purchase Successful">
        <div className="token-success-content">
          <div className="token-success-icon-container animate-in zoom-in-50 duration-300">
            <CheckCircle className="token-success-icon" />
          </div>

          <h2 className="token-success-title animate-in slide-in-from-bottom-5 duration-300 delay-100">
            Purchase Successful!
          </h2>

          <p className="token-success-subtitle animate-in slide-in-from-bottom-5 duration-300 delay-200">
            Your tokens have been added to your account
          </p>

          <div className="token-selectors-container animate-in slide-in-from-bottom-5 duration-300 delay-300">
            <ModelPreferencesSelectors
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          </div>

          <div className="token-success-button-container animate-in slide-in-from-bottom-5 duration-300 delay-400">
            <Button onClick={closeModal} className="token-success-button">
              Close
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  // Regular token purchase view
  return (
    <Modal
      id="tokenCheckout"
      title="Buy Ditto Tokens"
      fullScreen={true}
      icon={
        <div className="token-pricing-icon">
          <Coins />
        </div>
      }
    >
      <div className="token-checkout-content">
        <div className="token-info-container animate-in fade-in duration-300">
          {!balance.isLoading ? (
            <p className="token-balance-item">
              Current Balance:{" "}
              <span className="token-highlight-text">
                {balance.data?.balance}
              </span>{" "}
              tokens
            </p>
          ) : (
            <div className="token-spinner-container">
              <LoadingSpinner size={45} inline={true} />
            </div>
          )}
        </div>

        <div className="token-pricing-info">
          <div className="token-pricing-table">
            {PricingTiers.map(({ price, tokens, bonus }, index) => {
              const isSelected = price === amount
              return (
                <div
                  key={price}
                  onClick={() => handleAmountChange(price)}
                  className={cn(
                    "token-tier animate-in slide-in-from-left duration-300",
                    isSelected && "selected",
                    { "delay-100": index === 0 },
                    { "delay-200": index === 1 },
                    { "delay-300": index === 2 },
                    { "delay-400": index === 3 },
                    { "delay-500": index === 4 }
                  )}
                >
                  <div className="token-price">${price}</div>
                  <div className={cn("token-tokens", isSelected && "selected")}>
                    {tokens}
                  </div>
                  <div className={cn("token-bonus", isSelected && "selected")}>
                    +{bonus}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="token-checkout">
          <div className="token-checkout-button-container animate-in slide-in-from-bottom-10 duration-300 delay-600">
            <CheckoutForm
              usd={amount}
              successURL={`${window.location.origin}/?tokenSuccess=true`}
              cancelURL={window.location.origin}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
