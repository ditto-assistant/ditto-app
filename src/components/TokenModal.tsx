import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useBalance } from "@/hooks/useBalance"
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner"
import { CheckoutForm } from "@/components/CheckoutForm"
import Modal from "@/components/ui/modals/Modal"
import { useModal } from "@/hooks/useModal"
import "./TokenModal.css"
import { CheckCircle, Coins } from "lucide-react"
import { motion } from "framer-motion"
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2,
            }}
            className="token-success-icon-container"
          >
            <CheckCircle className="token-success-icon" />
          </motion.div>

          <motion.h2
            className="token-success-title"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Purchase Successful!
          </motion.h2>

          <motion.p
            className="token-success-subtitle"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Your tokens have been added to your account
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="token-selectors-container"
          >
            <ModelPreferencesSelectors
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="token-success-button-container"
          >
            <Button onClick={closeModal} className="token-success-button">
              Close
            </Button>
          </motion.div>
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
        <div className="token-info-container">
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
                <motion.div
                  key={price}
                  onClick={() => handleAmountChange(price)}
                  className={`token-tier ${isSelected ? "selected" : ""}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className="token-price">${price}</div>
                  <div
                    className={`token-tokens ${isSelected ? "selected" : ""}`}
                  >
                    {tokens}
                  </div>
                  <div
                    className={`token-bonus ${isSelected ? "selected" : ""}`}
                  >
                    +{bonus}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="token-checkout">
          <motion.div
            className="token-checkout-button-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CheckoutForm
              usd={amount}
              successURL={`${window.location.origin}/?tokenSuccess=true`}
              cancelURL={window.location.origin}
            />
          </motion.div>
        </div>
      </div>
    </Modal>
  )
}
