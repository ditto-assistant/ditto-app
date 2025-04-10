import { useState, useEffect } from "react";
import { Button, TextField, Slider } from "@mui/material";
import { useBalance } from "@/hooks/useBalance";
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner";
import { CheckoutForm } from "@/components/CheckoutForm";
import Modal from "@/components/ui/modals/Modal";
import { useModal } from "@/hooks/useModal";
import "./TokenModal.css";
import { FaCheckCircle, FaCoins } from "react-icons/fa";
import { motion } from "framer-motion";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import ModelPreferencesSelectors from "@/components/ModelPreferencesSelectors";

// Update the PricingTiers array
const PricingTiers = [
  { price: 5, tokens: "5B", bonus: "0%" },
  { price: 10, tokens: "11B", bonus: "10%" },
  { price: 25, tokens: "30B", bonus: "20%" },
  { price: 75, tokens: "100B", bonus: "33%" },
  { price: 100, tokens: "150B", bonus: "50%" },
];

// Update the getTokenAmount function to return billions
const getTokenAmount = (usd: number): string => {
  if (usd < 10) return `${usd}B`;
  if (usd === 10) return "11B";
  if (usd === 25) return "30B";
  if (usd === 75) return "100B";
  if (usd === 100) return "150B";
  return `${usd}B`; // Default to 1:1 ratio
};

export default function TokenModal() {
  const { createCloseHandler } = useModal();
  const closeModal = createCloseHandler("tokenCheckout");
  const balance = useBalance();
  const [amount, setAmount] = useState(10);
  const [showSuccess, setShowSuccess] = useState(false);
  const {
    preferences,
    updatePreferences,
    isLoading: preferencesLoading,
  } = useModelPreferences();
  const hasEnoughBalance = balance.data?.hasPremium ?? false;

  useEffect(() => {
    // Check if we should show the success screen
    const tokenSuccess = window.sessionStorage.getItem("token_success");
    if (tokenSuccess === "true") {
      setShowSuccess(true);
      // Clear the flag
      window.sessionStorage.removeItem("token_success");
    }
  }, []);

  const handleAmountChange = (value: number | string) => {
    const newAmount = Math.max(1, Number(value));
    setAmount(newAmount);
  };

  // Create token package header icon
  const tokenHeaderIcon = (
    <div className="token-pricing-icon">
      <FaCoins />
    </div>
  );

  if (showSuccess) {
    // Token purchase success view
    if (balance.isLoading || preferencesLoading || !preferences) {
      return (
        <Modal id="tokenCheckout" title="Purchase Successful">
          <div className="token-modal-loading">
            <LoadingSpinner size={45} />
          </div>
        </Modal>
      );
    }

    return (
      <Modal id="tokenCheckout" title="Purchase Successful" fullScreen={true}>
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
            <FaCheckCircle className="token-success-icon" />
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
              hasEnoughBalance={hasEnoughBalance}
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="token-success-button-container"
          >
            <Button
              variant="contained"
              onClick={closeModal}
              className="token-success-button"
            >
              Close
            </Button>
          </motion.div>
        </div>
      </Modal>
    );
  }

  // Regular token purchase view
  return (
    <Modal
      id="tokenCheckout"
      title="Buy Ditto Tokens"
      fullScreen={true}
      icon={tokenHeaderIcon}
    >
      <div className="token-checkout-content">
        <div className="token-info-container">
          <h3 className="token-balance-header">Current Balance</h3>
          <div className="token-balance-grid">
            {!balance.isLoading ? (
              <p className="token-balance-item">
                USD:{" "}
                <span className="token-highlight-text">
                  {balance.data?.usd}
                </span>{" "}
                (
                <span className="token-highlight-text">
                  {balance.data?.balance}
                </span>{" "}
                tokens)
              </p>
            ) : (
              <div className="token-spinner-container">
                <LoadingSpinner size={45} inline={true} />
              </div>
            )}
          </div>
        </div>
        <div className="token-divider"></div>

        <div className="token-pricing-info">
          <div className="token-pricing-table">
            {PricingTiers.map(({ price, tokens, bonus }, index) => {
              const isSelected = price === amount;
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
              );
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

          <div className="token-slider-container">
            <div className="token-slider-label">
              Amount: <span className="token-highlight-text">${amount}</span>
            </div>
            <div className="token-slider-label">
              Receive:{" "}
              <span className="token-highlight-text">
                {getTokenAmount(amount)}
              </span>{" "}
              tokens
            </div>
            <Slider
              value={amount}
              onChange={(_, value) => handleAmountChange(value as number)}
              min={1}
              max={100}
              step={1}
              sx={{
                color: "var(--primary)",
                "& .MuiSlider-rail": {
                  backgroundColor: "var(--background-darker)",
                },
                "& .MuiSlider-track": {
                  backgroundImage:
                    "linear-gradient(to right, #4752c4, #7289da)",
                },
                "& .MuiSlider-thumb": {
                  backgroundColor: "#fff",
                  "&:hover, &.Mui-focusVisible": {
                    boxShadow: "0 0 0 8px rgba(114, 137, 218, 0.16)",
                  },
                },
                "& .MuiSlider-mark": {
                  backgroundColor: "var(--background-darker)",
                },
                "& .MuiSlider-markLabel": {
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                },
                "& .MuiSlider-valueLabel": {
                  backgroundColor: "var(--primary)",
                },
              }}
            />
            <TextField
              type="number"
              label="Custom Amount"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              variant="outlined"
              InputProps={{
                style: {
                  color: "var(--text-primary)",
                  backgroundColor: "var(--background-darker)",
                },
                inputProps: { min: "1", step: "1" },
              }}
              InputLabelProps={{
                style: { color: "var(--text-secondary)" },
              }}
              className="token-custom-amount-input"
            />
          </div>

          {/* <motion.div
            className="token-preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            You will receive:{" "}
            <span className="token-highlight-text">
              {getTokenAmount(amount)} tokens
            </span>
          </motion.div> */}
        </div>
      </div>
    </Modal>
  );
}
