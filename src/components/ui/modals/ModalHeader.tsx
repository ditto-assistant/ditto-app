import React from "react";
import { MdClose } from "react-icons/md";
import { motion } from "framer-motion";
import "./ModalHeader.css";

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
  className = "",
}) => {
  return (
    <div className={`modal-header ${className}`}>
      <motion.h3
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {title}
      </motion.h3>
      <motion.div
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <MdClose className="close-icon" onClick={onClose} />
      </motion.div>
    </div>
  );
};
