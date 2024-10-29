import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrash } from 'react-icons/fa';

const VersionOverlay = ({ children, style, onDelete, onSelect }) => {
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
            <AnimatePresence>
                {children.map((child, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        whileHover={{ 
                            backgroundColor: 'rgba(88, 101, 242, 0.1)',
                            paddingLeft: '24px',
                            transition: { duration: 0.2 }
                        }}
                        style={styles.versionItem}
                        onClick={() => onSelect && onSelect(child)}
                    >
                        <motion.span 
                            style={styles.versionName}
                            whileHover={{ color: '#5865F2' }}
                        >
                            {child}
                        </motion.span>
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaTrash 
                                style={styles.deleteIcon} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(index);
                                }} 
                            />
                        </motion.div>
                    </motion.div>
                ))}
            </AnimatePresence>
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
    },
    versionName: {
        flex: 1,
        transition: 'color 0.2s ease',
    },
    deleteIcon: {
        color: '#DA373C',
        cursor: 'pointer',
        marginLeft: '8px',
        transition: 'color 0.2s ease',
        '&:hover': {
            color: '#A12828',
        },
    },
};

export default VersionOverlay; 