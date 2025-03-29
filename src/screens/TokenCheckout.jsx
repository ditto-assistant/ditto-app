import { useState } from "react";
import { Button, TextField, Slider } from "@mui/material";
import { useBalance } from "@/hooks/useBalance";
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner";
import { CheckoutForm } from "@/components/CheckoutForm";
import { useNavigate } from "react-router";

// Update the PricingTiers array
const PricingTiers = [
  { price: 5, tokens: "5B", bonus: "0%" },
  { price: 10, tokens: "11B", bonus: "10%" },
  { price: 25, tokens: "30B", bonus: "20%" },
  { price: 75, tokens: "100B", bonus: "33%" },
  { price: 100, tokens: "150B", bonus: "50%" },
];

// Update the getTokenAmount function to return billions
const getTokenAmount = (usd) => {
  if (usd < 10) return `${usd}B`;
  if (usd === 10) return "11B";
  if (usd === 25) return "30B";
  if (usd === 75) return "100B";
  if (usd === 100) return "150B";
  return `${usd}B`; // Default to 1:1 ratio
};

const TokenCheckout = () => {
  const navigate = useNavigate();
  const balance = useBalance();
  const [amount, setAmount] = useState(10);

  const handleAmountChange = (value) => {
    const newAmount = Math.max(1, Number(value));
    setAmount(newAmount);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h2 style={styles.headerTitle}>Buy Tokens</h2>
        </header>
        <div style={styles.content}>
          <div style={styles.infoContainer}>
            <h3 style={styles.balanceHeader}>Current Balance</h3>
            <div style={styles.balanceGrid}>
              {!balance.isLoading ? (
                <p style={styles.balanceItem}>
                  USD:{" "}
                  <span style={styles.highlightText}>{balance.data?.usd}</span>{" "}
                  (
                  <span style={styles.highlightText}>
                    {balance.data?.balance}
                  </span>{" "}
                  tokens)
                </p>
              ) : (
                <div style={styles.spinnerContainer}>
                  <LoadingSpinner size={45} inline={true} />
                </div>
              )}
            </div>
          </div>
          <div style={styles.divider}></div>

          <div style={styles.pricingInfo}>
            {/* <h3 style={styles.pricingTitle}>Token Packages</h3> */}
            <div style={styles.pricingTable}>
              {PricingTiers.map(({ price, tokens, bonus }) => {
                const isSelected = price === amount;
                return (
                  <div
                    key={price}
                    onClick={() => handleAmountChange(price)}
                    style={{
                      ...styles.tier,
                      ...(isSelected ? styles.selectedTier : {}),
                    }}
                  >
                    <div style={styles.price}>${price}</div>
                    <div
                      style={isSelected ? styles.selectedTokens : styles.tokens}
                    >
                      {tokens}
                    </div>
                    <div
                      style={isSelected ? styles.selectedBonus : styles.bonus}
                    >
                      +{bonus}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.checkout}>
            <div style={styles.sliderContainer}>
              <div style={styles.sliderLabel}>Amount: ${amount}</div>
              <Slider
                value={amount}
                onChange={(_, value) => handleAmountChange(value)}
                min={1}
                max={100}
                step={1}
                sx={{
                  color: "#7289da",
                  "& .MuiSlider-rail": {
                    backgroundColor: "#40444b",
                  },
                  "& .MuiSlider-track": {
                    backgroundColor: "#7289da",
                  },
                  "& .MuiSlider-thumb": {
                    backgroundColor: "#fff",
                    "&:hover, &.Mui-focusVisible": {
                      boxShadow: "0 0 0 8px rgba(114, 137, 218, 0.16)",
                    },
                  },
                  "& .MuiSlider-mark": {
                    backgroundColor: "#40444b",
                  },
                  "& .MuiSlider-markLabel": {
                    color: "#8e9297",
                    fontSize: "0.8rem",
                  },
                  "& .MuiSlider-valueLabel": {
                    backgroundColor: "#7289da",
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
                  style: { color: "white", backgroundColor: "#40444b" },
                  inputProps: { min: "1", step: "1" },
                }}
                InputLabelProps={{
                  style: { color: "#8e9297" },
                }}
                style={styles.customAmountInput}
              />
            </div>

            <div style={styles.tokenPreview}>
              You will receive:{" "}
              <span style={styles.highlightText}>
                {getTokenAmount(amount)} tokens
              </span>
            </div>

            <div style={styles.checkoutButtonContainer}>
              <CheckoutForm
                usd={amount}
                successURL={`${window.location.href}/success`}
                cancelURL={window.location.href}
              />
            </div>
          </div>

          <Button
            variant="contained"
            onClick={() => navigate("/")}
            style={styles.navButton}
          >
            GO BACK
          </Button>
        </div>
      </div>
    </div>
  );
};

// Update styles object
const styles = {
  overlay: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    minHeight: "100vh",
    backgroundColor: "#2f3136",
    padding: "20px",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: "#36393f",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    margin: "0 auto", // Center container
    marginTop: "20px", // Add some space at the top
    marginBottom: "20px", // Add some space at the bottom
  },
  header: {
    backgroundColor: "#2f3136",
    padding: "24px 0",
    borderRadius: "12px 12px 0 0",
    color: "white",
    textAlign: "center",
  },
  headerTitle: {
    margin: 0,
    fontSize: "2em",
    fontWeight: "600",
  },
  content: {
    padding: "0 0 24px",
    overflowX: "hidden", // Prevent horizontal scroll
  },
  infoContainer: {
    color: "white",
    textAlign: "center",
    backgroundColor: "#2f3136",
    padding: "12px",
  },
  balanceHeader: {
    margin: "0 0 8px 0",
    fontSize: "1.1em",
    fontWeight: "500",
    color: "#b9bbbe",
  },
  balanceGrid: {
    display: "flex",
    justifyContent: "center",
    minHeight: "24px",
  },
  balanceItem: {
    margin: 0,
    fontSize: "1.1em",
    color: "#dcddde",
  },
  highlightText: {
    color: "#7289da",
    fontWeight: "600",
  },
  divider: {
    height: "2px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  pricingInfo: {
    padding: "24px 20px",
    color: "white",
  },
  pricingTitle: {
    margin: "0 0 20px 0",
    fontSize: "1.4em",
    fontWeight: "600",
    textAlign: "center",
    color: "#ffffff",
  },
  pricingTable: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxWidth: "400px",
    margin: "0 auto",
    padding: "0 10px", // Add some padding for smaller screens
  },
  tier: {
    display: "grid",
    gridTemplateColumns: "80px 1fr 80px",
    alignItems: "center",
    padding: "16px 12px", // Reduce padding for smaller screens
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: "#2f3136",
    transition: "all 0.2s ease",
    "@media (max-width: 360px)": {
      // Add responsive styling for very small screens
      padding: "12px 8px",
      gridTemplateColumns: "60px 1fr 60px",
    },
  },
  selectedTier: {
    backgroundColor: "#7289da",
  },
  price: {
    textAlign: "left",
    fontSize: "1.2em",
    fontWeight: "bold",
    color: "white",
  },
  tokens: {
    textAlign: "center",
    color: "#7289da",
    fontSize: "1.1em",
    fontWeight: "500",
  },
  bonus: {
    textAlign: "right",
    fontSize: "0.95em",
    fontWeight: "500",
    color: "#43b581",
  },
  selectedTokens: {
    textAlign: "center",
    color: "white",
    fontSize: "1.1em",
    fontWeight: "500",
  },
  selectedBonus: {
    textAlign: "right",
    fontSize: "0.95em",
    fontWeight: "500",
    color: "#4fff9f",
  },
  checkout: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 20px",
    gap: "20px",
  },
  amountInput: {
    width: "240px",
  },
  tokenPreview: {
    color: "#dcddde",
    fontSize: "1.1em",
    textAlign: "center",
  },
  checkoutButtonContainer: {
    marginTop: "8px",
  },
  navButton: {
    margin: "8px auto 0",
    display: "block",
    backgroundColor: "#4f545c",
    color: "white",
    "&:hover": {
      backgroundColor: "#40444b",
    },
  },
  sliderContainer: {
    width: "100%",
    maxWidth: "400px",
    padding: "0 20px",
    boxSizing: "border-box", // Ensure padding is included in width calculation
  },
  sliderLabel: {
    color: "#dcddde",
    fontSize: "1.1em",
    marginBottom: "20px",
    textAlign: "center",
  },
  customAmountInput: {
    width: "100%",
    marginTop: "20px",
    boxSizing: "border-box",
  },
};

export default TokenCheckout;
