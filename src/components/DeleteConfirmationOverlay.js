import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle } from 'react-icons/fa';

const DeleteConfirmationOverlay = ({ isOpen, onClose, onConfirm, scriptName, isDeleteAll = false }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.overlay}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={styles.modal}
                onClick={e => e.stopPropagation()}
            >
                <FaExclamationTriangle style={styles.warningIcon} />
                <h3 style={styles.title}>Confirm Delete</h3>
                <p style={styles.message}>
                    {isDeleteAll 
                        ? `Are you sure you want to delete "${scriptName}" and all its versions? This action cannot be undone.`
                        : `Are you sure you want to delete "${scriptName}"? This action cannot be undone.`
                    }
                </p>
                <div style={styles.buttons}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={styles.cancelButton}
                        onClick={onClose}
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={styles.deleteButton}
                        onClick={onConfirm}
                    >
                        Delete {isDeleteAll ? 'All' : ''}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    modal: {
        backgroundColor: '#2B2D31',
        padding: '24px',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
        border: '1px solid #1E1F22',
    },
    warningIcon: {
        color: '#DA373C',
        fontSize: '48px',
        marginBottom: '16px',
    },
    title: {
        color: '#FFFFFF',
        margin: '0 0 16px 0',
        fontSize: '20px',
    },
    message: {
        color: '#B5BAC1',
        margin: '0 0 24px 0',
        fontSize: '14px',
        lineHeight: '1.5',
    },
    buttons: {
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
    },
    cancelButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #4F545C',
        backgroundColor: 'transparent',
        color: '#FFFFFF',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
    },
    deleteButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#DA373C',
        color: '#FFFFFF',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
    },
};

export default DeleteConfirmationOverlay;