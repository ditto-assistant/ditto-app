import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./SlidingMenu.css";

interface MenuItem {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

interface SlidingMenuProps {
  menuItems: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  position?: "left" | "right";
  triggerRef?: React.RefObject<HTMLElement>;
  isPinned?: boolean;
}

const SlidingMenu: React.FC<SlidingMenuProps> = ({
  menuItems,
  isOpen,
  onClose,
  position = "left",
  triggerRef,
  isPinned = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle hover events for the menu itself
  const handleMenuHover = () => {
    // Keep menu open while hovering over it
    // This is important for desktop hover behavior
  };

  const handleMenuLeave = () => {
    // Only apply hover behavior on desktop and when not pinned
    if (window.innerWidth > 768 && !isPinned) {
      // Small delay before closing to allow movement between menu and button
      setTimeout(() => {
        // Check if user hasn't moved back to the trigger button
        if (triggerRef && !triggerRef.current?.matches(":hover")) {
          onClose();
        }
      }, 150);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        (!triggerRef || !triggerRef.current?.contains(event.target as Node))
      ) {
        // Always close when clicking outside, even if pinned
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const getMenuAnimation = () => {
    const initialX = position === "left" ? -50 : 50;
    return {
      initial: { opacity: 0, x: initialX },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: initialX },
      transition: { type: "spring", damping: 25, stiffness: 300 },
    };
  };

  const menuAnimation = getMenuAnimation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`sliding-menu ${position === "right" ? "right-aligned" : ""} ${isPinned ? "pinned" : ""}`}
          ref={menuRef}
          onMouseEnter={handleMenuHover}
          onMouseLeave={handleMenuLeave}
          {...menuAnimation}
        >
          {menuItems.map((item, index) => (
            <motion.div
              key={index}
              className="menu-item"
              whileTap={{ scale: 0.95 }}
              whileHover={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                onClose();
              }}
              aria-label={item.text}
            >
              {item.icon}
              <span>{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SlidingMenu;
