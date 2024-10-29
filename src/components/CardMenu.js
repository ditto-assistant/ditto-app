import React from 'react';
import ReactDOM from 'react-dom';

const CardMenu = ({ children, style }) => {
    return ReactDOM.createPortal(
        <div 
            className="card-menu"
            style={{
                ...style,
                position: 'fixed',
                zIndex: 99999
            }}
            onClick={(e) => {
                // Stop propagation to prevent the overlay click handler from firing
                e.stopPropagation();
            }}
        >
            {children}
        </div>,
        document.body
    );
};

export default CardMenu; 