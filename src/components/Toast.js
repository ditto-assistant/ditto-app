import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';

const Toast = ({ message, isVisible, onHide }) => {
    React.useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onHide();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onHide]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    style={styles.toast}
                >
                    <div style={styles.iconContainer}>
                        <FaCheck size={16} />
                    </div>
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const styles = {
    toast: {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#2D7D46',
        color: '#FFFFFF',
        padding: '12px 20px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 2000,
        fontSize: '14px',
        fontWeight: 500,
    },
    iconContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

export default Toast; 