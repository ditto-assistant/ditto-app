import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useBalance } from "@/hooks/useBalance"
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner"
import { CheckoutForm } from "@/components/CheckoutForm"
import Modal from "@/components/ui/modals/Modal"
import { useModal } from "@/hooks/useModal"
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
          <div className="flex justify-center items-center min-h-[300px] w-full">
            <LoadingSpinner size={45} />
          </div>
        </Modal>
      )
    }

    return (
      <Modal id="tokenCheckout" title="Purchase Successful">
        <div className="flex flex-col items-center text-center p-10 w-full bg-[radial-gradient(circle_at_center,rgba(114,137,218,0.1),transparent_70%)]">
          <div className="mb-5 bg-white/10 rounded-full p-4 shadow-lg animate-in zoom-in-50 duration-300">
            <CheckCircle className="text-[64px] text-green-500" />
          </div>

          <h2 className="text-primary text-2xl font-semibold m-0 mb-4 animate-in slide-in-from-bottom-5 duration-300 delay-100">
            Purchase Successful!
          </h2>

          <p className="text-muted-foreground text-lg m-0 mb-8 animate-in slide-in-from-bottom-5 duration-300 delay-200">
            Your tokens have been added to your account
          </p>

          <div className="w-full max-w-[360px] mb-8 animate-in slide-in-from-bottom-5 duration-300 delay-300">
            <ModelPreferencesSelectors
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          </div>

          <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300 delay-400">
            <Button
              onClick={closeModal}
              className="bg-gradient-to-r from-primary to-blue-400 hover:bg-gradient-to-r hover:from-blue-400 hover:to-primary px-7 py-3 text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-lg"
            >
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
        <div
          className="text-[1.4rem] text-amber-400 flex items-center justify-center drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]"
          style={{ animation: "coinSpin 4s infinite ease-in-out" }}
        >
          <Coins />
        </div>
      }
    >
      <div className="flex flex-col p-0 pb-6 overflow-x-hidden text-foreground w-full">
        <div className="text-center bg-background-darker p-3 w-full animate-in fade-in duration-300">
          {!balance.isLoading ? (
            <p className="m-0 text-lg text-foreground">
              Current Balance:{" "}
              <span className="text-primary font-semibold px-0.5">
                {balance.data?.balance}
              </span>{" "}
              tokens
            </p>
          ) : (
            <div className="flex justify-center">
              <LoadingSpinner size={45} inline={true} />
            </div>
          )}
        </div>

        <div className="p-6 pt-6 text-foreground w-full">
          <div className="flex flex-col gap-2 max-w-[400px] mx-auto p-0 px-2.5 w-full">
            {PricingTiers.map(({ price, tokens, bonus }, index) => {
              const isSelected = price === amount
              return (
                <div
                  key={price}
                  onClick={() => handleAmountChange(price)}
                  className={cn(
                    "grid grid-cols-[80px_1fr_80px] items-center p-4 rounded-lg cursor-pointer bg-background-darker transition-all duration-200 box-border w-full border border-transparent shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-primary animate-in slide-in-from-left duration-300",
                    isSelected &&
                      "bg-gradient-to-r from-primary/20 to-blue-400/20 scale-[1.02] shadow-md",
                    { "delay-100": index === 0 },
                    { "delay-200": index === 1 },
                    { "delay-300": index === 2 },
                    { "delay-400": index === 3 },
                    { "delay-500": index === 4 }
                  )}
                >
                  <div className="text-left text-xl font-bold text-foreground">
                    ${price}
                  </div>
                  <div
                    className={cn(
                      "text-center text-primary text-lg font-medium",
                      isSelected && "text-foreground"
                    )}
                  >
                    {tokens}
                  </div>
                  <div
                    className={cn(
                      "text-right text-sm font-medium text-green-500 bg-green-500/10 py-1 px-2 rounded-full",
                      isSelected && "text-white bg-green-500/30"
                    )}
                  >
                    +{bonus}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-center p-6 gap-5 w-full">
          <div className="mt-2 mb-4 w-full max-w-[400px] flex justify-center animate-in slide-in-from-bottom-10 duration-300 delay-600">
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
