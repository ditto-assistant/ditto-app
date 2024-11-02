import React, { useState, useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";
import { FaBrain, FaTrash } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";
import "./MemoryOverlay.css";

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

function ScriptMemoryOverlay({ closeOverlay, modelPreferences, onModelChange, onResetHistory }) {
    const overlayContentRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 50);

        const handleClickOutside = (event) => {
            if (overlayContentRef.current && !overlayContentRef.current.contains(event.target)) {
                handleClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(closeOverlay, 300);
    };

    const handleResetHistory = async () => {
        // Create and show the confirmation dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.innerHTML = `
            <div class="confirmation-content">
                <h3>Reset Chat History</h3>
                <p>Are you sure you want to clear the chat history? This action cannot be undone.</p>
                <div class="confirmation-buttons">
                    <button class="cancel-button">Cancel</button>
                    <button class="confirm-button">Reset</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        setTimeout(() => dialog.classList.add('visible'), 50);

        return new Promise((resolve) => {
            const handleCancel = () => {
                dialog.classList.remove('visible');
                setTimeout(() => dialog.remove(), 300);
                resolve(false);
            };

            const handleConfirm = async () => {
                dialog.classList.remove('visible');
                setTimeout(() => dialog.remove(), 300);
                onResetHistory();
                resolve(true);
            };

            dialog.querySelector('.cancel-button').addEventListener('click', handleCancel);
            dialog.querySelector('.confirm-button').addEventListener('click', handleConfirm);
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) handleCancel();
            });
        });
    };

    return (
        <div className={`MemoryOverlay ${isVisible ? 'visible' : ''}`}>
            <div ref={overlayContentRef} className="MemoryContent" style={{ maxWidth: '400px' }}>
                <div style={styles.overlayHeader}>
                    <h3 style={styles.overlayHeaderText}>Chat Settings</h3>
                    <MdClose style={styles.closeIcon} onClick={handleClose} />
                </div>
                
                {/* Model Preferences Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <IoSettingsSharp style={styles.cardIcon} />
                        <h4 style={styles.cardTitle}>Programmer Model</h4>
                    </div>
                    <div style={styles.cardContent}>
                        <div style={styles.modelSelector}>
                            <select 
                                value={modelPreferences.programmerModel}
                                onChange={(e) => onModelChange(e.target.value)}
                                style={styles.modelSelect}
                            >
                                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                <option value="mistral-nemo">Mistral Nemo</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Reset History Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaTrash style={styles.cardIcon} />
                        <h4 style={styles.cardTitle}>Chat History</h4>
                    </div>
                    <div style={styles.cardContent}>
                        <button
                            style={{
                                ...styles.button,
                                background: darkModeColors.dangerGradient,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onClick={handleResetHistory}
                        >
                            Reset Chat History
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
    modelSelect: {
        backgroundColor: darkModeColors.foreground,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '4px',
        padding: '10px 12px',
        fontSize: '14px',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background-color 0.2s ease',
        '&:hover': {
            backgroundColor: '#292B2F',
        },
    },
    button: {
        padding: '10px',
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        '&:hover': {
            filter: 'brightness(1.1)',
            transform: 'translateY(-1px)',
        },
        '&:active': {
            transform: 'translateY(0px)',
        },
    },
};

export default ScriptMemoryOverlay; 