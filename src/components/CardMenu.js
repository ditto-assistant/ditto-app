import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CardMenu = ({ children, style }) => {
    const { transformOrigin, ...restStyle } = style;
    
    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div 
                className="card-menu"
                initial={{ opacity: 0, scale: 0.95, y: transformOrigin === 'bottom' ? 10 : -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: transformOrigin === 'bottom' ? 10 : -10 }}
                transition={{ duration: 0.2 }}
                style={{
                    ...restStyle,
                    position: 'fixed',
                    zIndex: 99999,
                    backgroundColor: '#2B2D31',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    border: '1px solid #1E1F22',
                    overflow: 'hidden',
                    minWidth: '160px',
                    transformOrigin: transformOrigin || 'top',
                    padding: '4px',
                }}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                {React.Children.map(children, (child, index) => (
                    <motion.div
                        whileHover={{ 
                            backgroundColor: 'rgba(88, 101, 242, 0.1)',
                            paddingLeft: '16px',
                        }}
                        transition={{ duration: 0.2 }}
                        style={{ 
                            width: '100%',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            fontSize: '13px',
                            color: '#B5BAC1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '4px',
                        }}
                    >
                        {child}
                    </motion.div>
                ))}
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default CardMenu; 