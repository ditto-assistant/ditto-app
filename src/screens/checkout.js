import { useState } from 'react';
import { saveBalanceToFirestore } from '../control/firebase';
import { Button, TextField } from '@mui/material';
import { useBalance } from '../hooks/useBalance';
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CheckoutForm } from '../api/checkoutSession';

const PricingTiers = [
    { price: 1, description: "1 token per $1" },
    { price: 10, description: "11 tokens for $10 (10% bonus)" },
    { price: 25, description: "30 tokens for $25 (20% bonus)" },
    { price: 75, description: "100 tokens for $75 (33% bonus)" },
    { price: 100, description: "150 tokens for $100 (50% bonus)" }
];

const getTokenAmount = (usd) => {
    if (usd < 10) return usd;
    if (usd === 10) return 11;
    if (usd === 25) return 30;
    if (usd === 75) return 100;
    if (usd === 100) return 150;
    return usd; // Default to 1:1 ratio
};

const Checkout = () => {
    const balance = useBalance();
    const [amount, setAmount] = useState(10);

    const handleAmountChange = (value) => {
        const newAmount = Math.max(1, Math.min(100, Number(value)));
        setAmount(newAmount);
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <h2>Buy Tokens</h2>
                </header>
                <div style={styles.content}>
                    <div style={styles.infoContainer}>
                        <h3 style={styles.balanceHeader}>Current Balance</h3>
                        <div style={styles.balanceGrid}>
                            {!balance.loading ? (
                                <>
                                    <p style={styles.balanceItem}>
                                        USD: <span style={styles.highlightText}>{balance.usd}</span> (<span style={styles.highlightText}>{balance.balance}</span> tokens)
                                    </p>
                                    <p style={styles.balanceItem}>
                                        Images: <span style={styles.highlightText}>{balance.images}</span>
                                    </p>
                                    <p style={styles.balanceItem}>
                                        Searches: <span style={styles.highlightText}>{balance.searches}</span>
                                    </p>
                                </>
                            ) : (
                                <div style={styles.spinnerContainer}>
                                    <LoadingSpinner size={45} inline={true} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={styles.divider}></div>

                    <div style={styles.pricingInfo}>
                        <h3>Token Packages</h3>
                        {PricingTiers.map(({ price, description }) => (
                            <div
                                key={price}
                                onClick={() => handleAmountChange(price)}
                                style={{
                                    ...styles.tier,
                                    ...(price === amount ? styles.selectedTier : {}),
                                    cursor: 'pointer',
                                }}
                            >
                                {description}
                            </div>
                        ))}
                    </div>

                    <div style={styles.checkout}>
                        <TextField
                            type="number"
                            label="Amount (USD)"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            variant="outlined"
                            InputProps={{
                                style: { color: 'white', backgroundColor: '#40444b' },
                                inputProps: { min: "1", max: "100", step: "1" }
                            }}
                            InputLabelProps={{
                                style: { color: '#8e9297' },
                            }}
                            style={styles.amountInput}
                        />

                        <div style={styles.tokenPreview}>
                            You will receive: <span style={styles.highlightText}>{getTokenAmount(amount)} tokens</span>
                        </div>

                        <div style={styles.checkoutButtonContainer}>
                            <CheckoutForm
                                usd={amount}
                                successURL={`${window.location.origin}/success`}
                                cancelURL={window.location.href}
                            />
                        </div>
                    </div>

                    <Button variant="contained" onClick={() => window.history.back()} style={styles.navButton}>
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#2f3136',
    },
    paypalContainer: {
        backgroundColor: '#36393f',
        borderRadius: '8px',
        width: '400px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
    },
    header: {
        backgroundColor: '#2f3136',
        padding: '15px 0 5px',
        borderRadius: '8px 8px 0 0',
        color: 'white',
        textAlign: 'center',
        fontSize: '1.2em',
        fontWeight: 'bold',
    },
    paypalContent: {
        padding: '0',
    },
    infoContainer: {
        color: 'white',
        textAlign: 'center',
        backgroundColor: '#2f3136',
        padding: '5px 15px 15px',
    },
    balanceHeader: {
        margin: '0 0 5px 0',
        fontSize: '1em',
        fontWeight: 'normal',
    },
    balanceGrid: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '90px',
    },
    balanceItem: {
        margin: '2px 0',
        fontSize: '0.9em',
    },
    highlightText: {
        color: '#7289da',
    },
    divider: {
        height: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        margin: '0 15px',
    },
    checkout: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: '#36393f',
    },
    amountInput: {
        marginBottom: '10px',
        width: '200px',
    },
    dropdown: {
        width: '200px',
        backgroundColor: '#40444b',
        color: 'white',
        borderRadius: '5px',
        marginBottom: '20px',
    },
    paypalButtonContainer: {
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
    },
    paypalButtons: {
        layout: 'vertical',
        shape: 'rect',
    },
    navButton: {
        margin: '20px auto',
        display: 'block',
        backgroundColor: '#7289da',
        color: 'white',
        '&:hover': {
            backgroundColor: '#5b6eae',
        },
    },
    spinnerContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '90px',
    },
    container: {
        backgroundColor: '#36393f',
        borderRadius: '8px',
        width: '500px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
    },
    pricingInfo: {
        padding: '15px',
        color: 'white',
        textAlign: 'center',
    },
    tier: {
        padding: '12px',
        margin: '8px 0',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
        backgroundColor: '#2f3136',
        '&:hover': {
            backgroundColor: '#40444b',
        },
    },
    selectedTier: {
        backgroundColor: '#7289da',
        '&:hover': {
            backgroundColor: '#677bc4',
        },
    },
    tokenPreview: {
        color: 'white',
        margin: '15px 0',
        fontSize: '1.1em',
    },
    checkoutButtonContainer: {
        marginTop: '15px',
    },
};

export default Checkout;
