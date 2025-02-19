import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import "./ModalButton.css";

interface ModalButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "submit";
  icon?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  children,
  variant = "primary",
  icon,
  isLoading,
  fullWidth,
  className = "",
  ...props
}) => {
  return (
    <motion.button
      className={`modal-button ${variant} ${
        fullWidth ? "full-width" : ""
      } ${className}`}
      whileHover={{ y: -2, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
      whileTap={{ scale: 0.98 }}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="button-spinner" />
      ) : (
        <>
          {icon && <span className="button-icon">{icon}</span>}
          <span className="button-text">{children}</span>
        </>
      )}
    </motion.button>
  );
};
