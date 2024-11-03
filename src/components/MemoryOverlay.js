import React, { useState, useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";
import { FaBrain, FaMemory, FaTrash, FaCrown } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";
import "./MemoryOverlay.css";

import { resetConversation, deleteAllUserImagesFromFirebaseStorageBucket, saveModelPreferencesToFirestore, getModelPreferencesFromFirestore } from "../control/firebase";
import { useBalance } from '../hooks/useBalance';
import ModelDropdown from './ModelDropdown';

const darkModeColors = {
    primary: '#7289DA',
    text: '#FFFFFF',
    foreground: '#23272A',
    cardBg: '#2F3136',
    dangerRed: '#ED4245',
    dangerGradient: 'linear-gradient(180deg, #ED4245 0%, #A12D2F 100%)',
    success: '#3BA55D',
    hover: '#4752C4',
};

function MemoryOverlay({ closeOverlay }) {
    const overlayContentRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [modelPreferences, setModelPreferences] = useState({
        mainModel: "gemini-1.5-flash",
        programmerModel: "gemini-1.5-flash"
    });

    const [memoryStatus, setMemoryStatus] = useState({
        longTerm: JSON.parse(localStorage.getItem("deactivateLongTermMemory")) || false,
        shortTerm: JSON.parse(localStorage.getItem("deactivateShortTermMemory")) || false,
    });

    const { balance, usd } = useBalance();
    
    // Convert balance string to number (removing 'M' or 'B' and converting to float)
    const balanceNum = parseFloat(balance?.replace(/[MB]/, '') || '0');
    const isBalanceInBillions = balance?.includes('B');
    const hasEnoughBalance = isBalanceInBillions && balanceNum >= 1.00;

    // Helper function to check if model is premium and should be disabled
    const isPremiumModel = (model) => {
        return ['claude-3-5-sonnet', 'gemini-1.5-pro'].includes(model);
    };

    useEffect(() => {
        // Load model preferences
        const userID = localStorage.getItem("userID");
        getModelPreferencesFromFirestore(userID).then(prefs => {
            setModelPreferences(prefs);
        });

        // Trigger the animation after component mount
        setTimeout(() => setIsVisible(true), 50);

        const handleClickOutside = (event) => {
            if (overlayContentRef.current && !overlayContentRef.current.contains(event.target)) {
                handleClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        // Automatically switch models if balance decreases below 1.00B
        if (!hasEnoughBalance) {
            setModelPreferences(prev => ({
                mainModel: isPremiumModel(prev.mainModel) ? "gemini-1.5-flash" : prev.mainModel,
                programmerModel: isPremiumModel(prev.programmerModel) ? "gemini-1.5-flash" : prev.programmerModel
            }));
        }
    }, [hasEnoughBalance]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(closeOverlay, 300); // Wait for the animation to finish before closing
    };

    const handleModelChange = async (type, value) => {
        // Prevent selection of premium models if balance is insufficient
        if (isPremiumModel(value) && !hasEnoughBalance) {
            return;
        }

        const userID = localStorage.getItem("userID");
        const newPreferences = {
            ...modelPreferences,
            [type]: value
        };
        setModelPreferences(newPreferences);
        await saveModelPreferencesToFirestore(userID, newPreferences.mainModel, newPreferences.programmerModel);
    };

    const deleteAllMemory = async() => {
        // Create and show the custom confirmation dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.innerHTML = `
            <div class="confirmation-content">
                <h3>Delete All Memory</h3>
                <p>Are you sure you want to delete all memory? This action cannot be undone.</p>
                <div class="confirmation-buttons">
                    <button class="cancel-button">Cancel</button>
                    <button class="confirm-button">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add fade-in effect
        setTimeout(() => dialog.classList.add('visible'), 50);

        // Handle button clicks
        return new Promise((resolve) => {
            const handleCancel = () => {
                dialog.classList.remove('visible');
                setTimeout(() => dialog.remove(), 300);
                resolve(false);
            };

            const handleConfirm = async () => {
                dialog.classList.remove('visible');
                setTimeout(() => dialog.remove(), 300);
                
                console.log("Resetting conversation history...");
                localStorage.setItem("resetMemory", "true");
                const userID = localStorage.getItem("userID");
                localStorage.removeItem("prompts");
                localStorage.removeItem("responses");
                localStorage.removeItem("histCount");
                await resetConversation(userID);
                await deleteAllUserImagesFromFirebaseStorageBucket(userID);

                // Dispatch a custom event to notify other components
                const event = new CustomEvent('memoryDeleted');
                window.dispatchEvent(event);

                resolve(true);
            };

            dialog.querySelector('.cancel-button').addEventListener('click', handleCancel);
            dialog.querySelector('.confirm-button').addEventListener('click', handleConfirm);
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) handleCancel();
            });
        });
    };

    const toggleMemoryActivation = (memoryType) => {
        setMemoryStatus((prev) => {
            const newStatus = !prev[memoryType];
            if (memoryType === "longTerm") {
                localStorage.setItem("deactivateLongTermMemory", newStatus);
                if (!newStatus) {
                    localStorage.removeItem("longTermMemory");
                }
            } else if (memoryType === "shortTerm") {
                localStorage.setItem("deactivateShortTermMemory", newStatus);
                if (!newStatus) {
                    localStorage.removeItem("shortTermMemory");
                }
            }
            return {
                ...prev,
                [memoryType]: newStatus,
            };
        });
    };

    return (
        <div className={`MemoryOverlay ${isVisible ? 'visible' : ''}`}>
            <div ref={overlayContentRef} className="MemoryContent">
                <div style={styles.overlayHeader}>
                    <h3 style={styles.overlayHeaderText}>Agent Settings</h3>
                    <MdClose style={styles.closeIcon} onClick={handleClose} />
                </div>
                
                {/* Model Preferences Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <IoSettingsSharp style={styles.cardIcon} />
                        <h4 style={styles.cardTitle}>Model Preferences</h4>
                    </div>
                    <div style={styles.cardContent}>
                        <div style={styles.modelSelector}>
                            <label style={styles.modelLabel}>Main Agent Model</label>
                            <ModelDropdown
                                value={modelPreferences.mainModel}
                                onChange={(value) => handleModelChange('mainModel', value)}
                                hasEnoughBalance={hasEnoughBalance}
                                inMemoryOverlay={true}
                            />
                        </div>
                        <div style={styles.modelSelector}>
                            <label style={styles.modelLabel}>Programmer Model</label>
                            <ModelDropdown
                                value={modelPreferences.programmerModel}
                                onChange={(value) => handleModelChange('programmerModel', value)}
                                hasEnoughBalance={hasEnoughBalance}
                                inMemoryOverlay={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Memory Controls Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaBrain style={styles.cardIcon} />
                        <h4 style={styles.cardTitle}>Memory Controls</h4>
                    </div>
                    <div style={styles.cardContent}>
                        <div style={styles.memoryControl}>
                            <div style={styles.memoryControlHeader}>
                                <span style={styles.memoryControlTitle}>Long Term Memory</span>
                                <span style={memoryStatus.longTerm ? styles.inactiveIndicator : styles.activeIndicator}>
                                    {memoryStatus.longTerm ? 'Inactive' : 'Active'}
                                </span>
                            </div>
                            <button
                                style={{
                                    ...styles.button,
                                    backgroundColor: darkModeColors.primary
                                }}
                                onClick={() => toggleMemoryActivation("longTerm")}
                            >
                                {memoryStatus.longTerm ? "Activate" : "Deactivate"}
                            </button>
                        </div>

                        <div style={styles.memoryControl}>
                            <div style={styles.memoryControlHeader}>
                                <span style={styles.memoryControlTitle}>Short Term Memory</span>
                                <span style={memoryStatus.shortTerm ? styles.inactiveIndicator : styles.activeIndicator}>
                                    {memoryStatus.shortTerm ? 'Inactive' : 'Active'}
                                </span>
                            </div>
                            <button
                                style={{
                                    ...styles.button,
                                    backgroundColor: darkModeColors.primary
                                }}
                                onClick={() => toggleMemoryActivation("shortTerm")}
                            >
                                {memoryStatus.shortTerm ? "Activate" : "Deactivate"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Memory Manager Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaTrash style={styles.cardIcon} />
                        <h4 style={styles.cardTitle}>Memory Manager</h4>
                    </div>
                    <div style={styles.cardContent}>
                        <button
                            style={{
                                ...styles.button,
                                background: darkModeColors.dangerGradient,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onClick={deleteAllMemory}
                        >
                            Delete All Memory
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '0 4px',
    },
    overlayHeaderText: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '600',
        color: darkModeColors.text,
    },
    closeIcon: {
        fontSize: '24px',
        cursor: 'pointer',
        color: darkModeColors.text,
        opacity: 0.7,
        transition: 'opacity 0.2s ease',
        '&:hover': {
            opacity: 1,
        },
    },
    card: {
        backgroundColor: darkModeColors.cardBg,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
    },
    cardIcon: {
        fontSize: '20px',
        marginRight: '12px',
        color: darkModeColors.primary,
    },
    cardTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: darkModeColors.text,
    },
    cardContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    modelSelector: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    modelLabel: {
        fontSize: '14px',
        color: darkModeColors.text,
        opacity: 0.8,
    },
    memoryControl: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    memoryControlHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    memoryControlTitle: {
        fontSize: '14px',
        color: darkModeColors.text,
        fontWeight: '500',
    },
    activeIndicator: {
        fontSize: '12px',
        color: darkModeColors.success,
        backgroundColor: `${darkModeColors.success}20`,
        padding: '4px 8px',
        borderRadius: '4px',
    },
    inactiveIndicator: {
        fontSize: '12px',
        color: darkModeColors.dangerRed,
        backgroundColor: `${darkModeColors.dangerRed}20`,
        padding: '4px 8px',
        borderRadius: '4px',
    },
    button: {
        padding: '10px',
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'background-color 0.2s ease',
        '&:hover': {
            filter: 'brightness(1.1)',
        },
    },
    balanceWarning: {
        color: '#ED4245',
        fontSize: '12px',
        marginTop: '4px',
        fontStyle: 'italic',
    },
};

export default MemoryOverlay;
