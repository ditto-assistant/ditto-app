import React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import "@/styles/buttons.css"

interface ModalButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "submit"
  icon?: React.ReactNode
  isLoading?: boolean
  fullWidth?: boolean
  fixedWidth?: boolean
  size?: "small" | "default" | "large"
  children?: React.ReactNode
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  children,
  variant = "primary",
  icon,
  isLoading,
  fullWidth,
  fixedWidth,
  size,
  className = "",
  ...props
}) => {
  const buttonClasses = [
    "ditto-button",
    variant,
    fullWidth ? "full-width" : "",
    fixedWidth ? "fixed-width" : "",
    size ? size : "",
    className
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <motion.button
      className={buttonClasses}
      whileHover={{ y: -2, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
      whileTap={{ scale: 0.98 }}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="spinner button" />
      ) : (
        <>
          {icon && <span className="button-icon">{icon}</span>}
          <span className="button-text">{children}</span>
        </>
      )}
    </motion.button>
  )
}
