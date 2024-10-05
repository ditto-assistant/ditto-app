import React, { useState, useEffect } from 'react';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { saveBalanceToFirestore } from '../control/firebase';
import { PAYPAL_CLIENT_ID } from '../config';
import { Button, Divider, TextField } from '@mui/material';

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
    let userID = localStorage.getItem("userID");
    let localBalance = localStorage.getItem(`${userID}_balance`) || 0;
    if (localBalance === "NaN") {
        localBalance = 0;
    }
    const [balance, setBalance] = useState(Number(localBalance));
    const [infoOverlayVisible, setInfoOverlayVisible] = useState(false);
    const [amount, setAmount] = useState('5.00'); // Default amount

    const toggleInfoOverlay = () => {
        setInfoOverlayVisible(!infoOverlayVisible);
    };

    const tokensLeftInput = (balance / 0.6) * 1000000;
    const tokensLeftOutput = (balance / 2.4) * 1000000;
    const tokensPerImage = 765;
    const tokensInImages = Math.floor(tokensLeftOutput / tokensPerImage);

    const tokensLeftInputPretty = tokensLeftInput.toLocaleString();
    const tokensLeftOutputPretty = tokensLeftOutput.toLocaleString();
    const tokensInImagesPretty = tokensInImages.toLocaleString();

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
                    value: Number(amount),
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
            setBalance(newBalance);
        });
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.paypalContainer}>
                <header style={styles.header}>
                    <h2>Tokens and Balance</h2>
                </header>
                <Divider style={styles.divider} />
                <div style={styles.paypalContent}>
                    <div style={styles.infoContainer}>
                        <p>Current Balance: <span style={{ color: '#7289da' }}>${balance.toFixed(2)}</span></p>
                        <p>Input Tokens: <span style={{ color: '#7289da' }}>{tokensLeftInputPretty}</span></p>
                        <p>Output Tokens: <span style={{ color: '#7289da' }}>{tokensLeftOutputPretty}</span></p>
                        <p>Images: <span style={{ color: '#7289da' }}>{tokensInImagesPretty}</span></p>
                    </div>
                    <Button variant="contained" onClick={toggleInfoOverlay} style={styles.infoButton}>ℹ️ Info</Button>
                    {infoOverlayVisible && (
                        <div style={styles.overlayInfo}>
                            <p>$0.6 / 1 million input tokens</p>
                            <p>$2.4 / 1 million output tokens</p>
                            <p>300 characters = 74 tokens</p>
                            <p>1 image (1000x1000) = 765 tokens</p>
                            <Button variant="contained" onClick={toggleInfoOverlay} style={styles.closeButton}>Close</Button>
                        </div>
                    )}
                    <Divider style={styles.divider} />
                    <div className="checkout" style={styles.checkout}>
                        <TextField
                            type="number"
                            label="Amount"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            variant="outlined"
                            slotProps={{
                                htmlInput: {
                                    style: { color: 'white', backgroundColor: '#2f3136' },
                                    min: "1.00",
                                    step: "1.00",
                                },
                                inputLabel: {
                                    style: { color: 'white' },
                                },
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
                                        style: { color: 'white', backgroundColor: '#2f3136' },
                                    }}
                                    InputLabelProps={{
                                        style: { color: 'white' },
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
                        Go Back
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
        textAlign: 'center',
        padding: '20px',
        width: '400px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
    },
    header: {
        backgroundColor: '#2f3136',
        padding: '10px 0',
        borderRadius: '8px 8px 0 0',
        color: 'white',
    },
    paypalContent: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        // margin: '5px 0',
        marginBottom: '5px',
        color: 'white',
        textAlign: 'center',
    },
    infoButton: {
        backgroundColor: '#7289da',
        color: 'white',
        '&:hover': {
            backgroundColor: '#5b6eae',
        },
    },
    overlayInfo: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#36393f',
        color: 'white',
        padding: '60px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        zIndex: '1000',
        textAlign: 'center',
    },
    closeButton: {
        marginTop: '10px',
        backgroundColor: '#7289da',
        color: 'white',
        '&:hover': {
            backgroundColor: '#5b6eae',
        },
    },
    paypalButtonContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '20px',
    },
    paypalButtons: {
        layout: 'vertical',
        shape: 'rect',
        color: 'gold',
        label: 'paypal',
        height: 35,
    },
    dropdown: {
        width: '200px',
        backgroundColor: '#2f3136',
        color: 'white',
        borderRadius: '5px',
        // marginBottom: '20px',
    },
    amountInput: {
        marginBottom: '10px',
        width: '200px',
    },
    navButton: {
        marginTop: '20px',
        backgroundColor: '#7289da',
        color: 'white',
        '&:hover': {
            backgroundColor: '#5b6eae',
        },
    },
    divider: {
        backgroundColor: '#2f3136',
        margin: '20px 0'
    },
    checkout: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
};

export default Paypal;