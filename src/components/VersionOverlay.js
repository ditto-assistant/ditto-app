import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const VersionOverlay = ({ children, style }) => {
    return ReactDOM.createPortal(
        <motion.div 
            className="version-overlay"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
                ...style,
                position: 'fixed',
                zIndex: 100000
            }}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            {children}
        </motion.div>,
        document.body
    );
};

export default VersionOverlay; 