import React from "react";
import { MdClose, MdFullscreen, MdFullscreenExit } from "react-icons/md";
import { motion } from "framer-motion";

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
  className = "",
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  // Handle touch events separately to prevent iOS Safari issues
  const handleButtonTouch = (e: React.TouchEvent, callback: () => void) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Prevent default behavior
    callback();
  };

  return (
    <div className={`modal-header ${className}`}>
      <motion.h3
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {title}
      </motion.h3>
      <div className="modal-controls">
        {onToggleFullscreen && (
          <motion.button
            className="modal-control fullscreen"
            onClick={onToggleFullscreen}
            onTouchEnd={(e) => handleButtonTouch(e, onToggleFullscreen)}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <MdFullscreenExit size={20} />
            ) : (
              <MdFullscreen size={20} />
            )}
          </motion.button>
        )}
        <motion.button
          className="modal-control close"
          onClick={onClose}
          onTouchEnd={(e) => handleButtonTouch(e, onClose)}
          aria-label="Close"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MdClose size={20} />
        </motion.button>
      </div>
    </div>
  );
};
