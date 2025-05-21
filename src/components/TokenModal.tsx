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

  const renderContent = () => {
    if (showSuccess) {
      // Token purchase success view
      if (balance.isLoading || preferencesLoading || !preferences) {
        return (
          <div className="token-modal-loading">
            <LoadingSpinner size={45} />
          </div>
        )
      }

      return (
        <div className="token-success-content">
          <div className="token-success-icon-container">
            <CheckCircle className="token-success-icon" />
          </div>

          <h2 className="token-success-title">Purchase Successful!</h2>

          <p className="token-success-subtitle">
            Your tokens have been added to your account
          </p>

          <div className="token-selectors-container">
            <ModelPreferencesSelectors
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          </div>

          <div className="token-success-button-container">
            <Button onClick={closeModal} className="token-success-button">
              Close
            </Button>
          </div>
        </div>
      )
    }

    // Regular token purchase view
    return (
      <>
        <div className="token-modal-header">
          <Coins className="header-icon" />
          <h2 className="header-title">Get More Tokens</h2>
        </div>
        <div className="token-modal-body">
          <div className="pricing-grid">
            {PricingTiers.map((tier) => (
              <div key={tier.price} className="pricing-tier">
                <span className="tier-tokens">{tier.tokens}</span>
                <span className="tier-price">${tier.price}</span>
                {tier.bonus !== "0%" && (
                  <span className="tier-bonus">+{tier.bonus} bonus!</span>
                )}
              </div>
            ))}
          </div>
          <CheckoutForm
            usd={amount}
            successURL={`${window.location.origin}/?tokenSuccess=true`}
            cancelURL={window.location.origin}
          />
        </div>
        <div className="token-modal-footer">
          <p className="footer-text">
            Tokens are used for all models. View model preferences:
          </p>
          {preferences && (
            <ModelPreferencesSelectors
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          )}
        </div>
      </>
    )
  }

  return (
    <Modal
      id="tokenCheckout"
      title="Token Purchase"
      fullScreen={false}
      notResizable={true}
    >
      {renderContent()}
    </Modal>
  )
}
