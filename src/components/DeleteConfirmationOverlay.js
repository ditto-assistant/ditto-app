import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { Button } from '@mui/material';

const darkModeColors = {
    background: '#1E1F22',
    foreground: '#2B2D31',
    primary: '#5865F2',
    secondary: '#4752C4',
    text: '#FFFFFF',
    textSecondary: '#B5BAC1',
    border: '#2B2D31',
    danger: '#DA373C',
    dangerHover: '#A12828',
};

const DeleteConfirmationOverlay = ({ isOpen, onClose, onConfirm, scriptName }) => {
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <div style={styles.container}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.backdrop}
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={styles.iconContainer}>
                            <FaExclamationTriangle size={32} color={darkModeColors.danger} />
                        </div>
                        <h2 style={styles.title}>Delete Script?</h2>
                        <p style={styles.message}>
                            Are you sure you want to delete <span style={styles.scriptName}>{scriptName}</span>? 
                            This action cannot be undone.
                        </p>
                        <div style={styles.buttons}>
                            <Button
                                variant="contained"
                                onClick={onClose}
                                sx={styles.cancelButton}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={onConfirm}
                                startIcon={<FaTrash />}
                                sx={styles.deleteButton}
                            >
                                Delete
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

const styles = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
    },
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
    },
    modal: {
        position: 'relative',
        backgroundColor: darkModeColors.foreground,
        padding: '24px',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        border: `1px solid ${darkModeColors.border}`,
    },
    iconContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '16px',
    },
    title: {
        color: darkModeColors.text,
        margin: '0 0 16px 0',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: '600',
    },
    message: {
        color: darkModeColors.textSecondary,
        margin: '0 0 24px 0',
        textAlign: 'center',
        lineHeight: '1.5',
        fontSize: '14px',
    },
    scriptName: {
        color: darkModeColors.text,
        fontWeight: '500',
    },
    buttons: {
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
        },
    },
    deleteButton: {
        backgroundColor: darkModeColors.danger,
        '&:hover': {
            backgroundColor: darkModeColors.dangerHover,
        },
    },
};

export default DeleteConfirmationOverlay;