import React from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { FaTrash } from 'react-icons/fa';

const VersionOverlay = ({ children, style, onDelete }) => {
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
                zIndex: 100000,
                maxHeight: '200px',
                overflowY: 'auto',
            }}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            {children.map((child, index) => (
                <div key={index} style={styles.versionItem}>
                    <span style={styles.versionName}>{child}</span>
                    <FaTrash 
                        style={styles.deleteIcon} 
                        onClick={() => onDelete(index)} 
                    />
                </div>
            ))}
        </motion.div>,
        document.body
    );
};

const styles = {
    versionItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: '#FFFFFF',
        transition: 'all 0.2s ease',
        borderBottom: '1px solid #2B2D31',
        '&:hover': {
            backgroundColor: '#5865F215',
        },
    },
    versionName: {
        flex: 1,
    },
    deleteIcon: {
        color: '#DA373C',
        cursor: 'pointer',
        marginLeft: '8px',
        '&:hover': {
            color: '#A12828',
        },
    },
};

export default VersionOverlay; 