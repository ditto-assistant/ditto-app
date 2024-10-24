import React, { useState, useEffect } from 'react';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { saveBalanceToFirestore } from '../control/firebase';
import { PAYPAL_CLIENT_ID } from '../config';
import { Button, Divider, TextField } from '@mui/material';
import { useBalance } from '../hooks/useBalance';

const Paypal = () => {
    const initialOptions = {
        "client-id": PAYPAL_CLIENT_ID,
        currency: "USD",
        intent: "capture",
    };

    useEffect(() => { }, [localStorage.getItem(`${localStorage.getItem("userID")}_balance"`)]);

    return (
        <PayPalScriptProvider options={initialOptions}>
            <Checkout />
        </PayPalScriptProvider>
    );
};

const Checkout = () => {
    const balance = useBalance();
    const [amount, setAmount] = useState('5.00'); // Default amount as string
    const [{ options, isPending }, dispatch] = usePayPalScriptReducer();
    const [currency, setCurrency] = useState(options.currency || "USD");

    const onCurrencyChange = ({ target: { value } }) => {
        setCurrency(value);
        dispatch({
            type: "resetOptions",
            value: {
                ...options,
                currency: value,
            },
        });
    };

    const onCreateOrder = (data, actions) => {
        return actions.order.create({
            purchase_units: [{
                amount: {
                    value: amount,
                },
            }],
        });
    };

    // refresh if amount changes
    useEffect(() => {
        dispatch({
            type: "resetOptions",
            value: {
                ...options,
                currency,
            },
        });
    }, [amount]);

    const onApproveOrder = (data, actions) => {
        return actions.order.capture().then(details => {
            alert(`Transaction completed! $${amount} has been added to your balance.`);
            let userID = localStorage.getItem("userID");

            let localBalance = localStorage.getItem(`${userID}_balance`) || 0;
            if (localBalance === "NaN") {
                localBalance = 0;
            }
            let newBalance = Number(localBalance) + Number(amount);
            localStorage.setItem(`${userID}_balance`, newBalance);
            saveBalanceToFirestore(userID, newBalance);
            // Assuming setBalance is a function to update the balance context
            setBalance(newBalance);
        });
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.paypalContainer}>
                <header style={styles.header}>
                    <h2>Buy Tokens</h2>
                </header>
                <div style={styles.paypalContent}>
                    <div style={styles.infoContainer}>
                        <h3 style={styles.balanceHeader}>Current Balance</h3>
                        <div style={styles.balanceGrid}>
                            <p style={styles.balanceItem}>
                                USD: <span style={styles.highlightText}>{balance.usd}</span> (<span style={styles.highlightText}>{balance.balance}</span> tokens)
                            </p>
                            <p style={styles.balanceItem}>
                                Images: <span style={styles.highlightText}>{balance.images}</span>
                            </p>
                            <p style={styles.balanceItem}>
                                Searches: <span style={styles.highlightText}>{balance.searches}</span>
                            </p>
                        </div>
                    </div>
                    <div style={styles.divider}></div>
                    <div className="checkout" style={styles.checkout}>
                        <TextField
                            type="number"
                            label="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)} // Store as string
                            variant="outlined"
                            InputProps={{
                                style: { color: 'white', backgroundColor: '#40444b' },
                                inputProps: { min: "1.00", step: "1.00" } // Add min and step
                            }}
                            InputLabelProps={{
                                style: { color: '#8e9297' },
                            }}
                            style={styles.amountInput}
                        />
                        {isPending ? <p>Loading...</p> : (
                            <>
                                <TextField
                                    select
                                    SelectProps={{
                                        native: true,
                                    }}
                                    value={currency}
                                    onChange={onCurrencyChange}
                                    variant="outlined"
                                    InputProps={{
                                        style: { color: 'white', backgroundColor: '#40444b' },
                                    }}
                                    style={styles.dropdown}
                                >
                                    <option style={{ color: 'black' }} value="USD">💵 USD</option>
                                    <option style={{ color: 'black' }} value="EUR">💶 Euro</option>
                                </TextField>
                                <div style={styles.paypalButtonContainer}>
                                    <PayPalButtons
                                        style={styles.paypalButtons}
                                        createOrder={onCreateOrder}
                                        onApprove={onApproveOrder}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <Button variant="contained" onClick={() => window.history.back()} style={styles.navButton}>
                        GO BACK
                    </Button>
                </div>
            </div>
        </div>
    );
};

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
};

export default Paypal;
