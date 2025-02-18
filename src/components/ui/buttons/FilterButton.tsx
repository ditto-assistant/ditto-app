import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import "./FilterButton.css";

interface FilterButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  icon?: React.ReactNode;
  isActive?: boolean;
  activeColor?: string;
  children?: React.ReactNode;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  children,
  icon,
  isActive,
  activeColor,
  className = "",
  style,
  ...props
}) => {
  return (
    <motion.button
      className={`filter-button ${isActive ? "active" : ""} ${className}`}
      style={{
        ...(isActive && activeColor ? { background: activeColor } : {}),
        ...style,
      }}
      whileHover={{ y: -2, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {icon && <span className="filter-icon">{icon}</span>}
      {children}
    </motion.button>
  );
};
