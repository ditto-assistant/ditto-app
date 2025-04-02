import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./SlidingMenu.css";
import { usePlatform } from "@/hooks/usePlatform";
import { useUser } from "@/hooks/useUser";
import { FaCrown } from "react-icons/fa";
import { useModal } from "@/hooks/useModal";

interface MenuItem {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  minimumTier?: number;
}

interface SlidingMenuProps {
  menuItems: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  position?: "left" | "right" | "center";
  triggerRef?: React.RefObject<HTMLElement>;
  isPinned?: boolean;
  menuPosition?: "top" | "bottom";
  menuTitle?: string;
}

const SlidingMenu: React.FC<SlidingMenuProps> = ({
  menuItems,
  isOpen,
  onClose,
  position = "left",
  triggerRef,
  isPinned = false,
  menuPosition = "top",
  menuTitle,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { isMobile } = usePlatform();
  const { data: user } = useUser();
  const { createOpenHandler } = useModal();

  const handleMenuLeave = () => {
    // Only apply hover behavior on desktop and when not pinned
    if (!isMobile && !isPinned) {
      // Small delay before closing to allow movement between menu and button
      setTimeout(() => {
        // Check if user hasn't moved back to the trigger button
        if (triggerRef && !triggerRef.current?.matches(":hover")) {
          onClose();
        }
      }, 150);
    }
  };

  const isItemLocked = (minimumTier?: number) => {
    if (!minimumTier) return false;
    const userTier = user?.planTier || 0;
    return userTier < minimumTier;
  };

  const handleItemClick = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isItemLocked(item.minimumTier)) {
      // Create a new handler with the general tab specified
      const openSettingsWithGeneralTab = createOpenHandler(
        "settings",
        "general",
      );
      openSettingsWithGeneralTab();
    } else {
      item.onClick();
      onClose();
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
    // For bottom-aligned menus, animate vertically
    if (menuPosition === "bottom") {
      return {
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 50 },
        transition: { type: "spring", damping: 25, stiffness: 300 },
      };
    }

    // For standard top menus, animate horizontally
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
          className={`sliding-menu ${position === "right" ? "right-aligned" : ""} ${position === "center" ? "center-aligned" : ""} ${isPinned ? "pinned" : ""} ${menuPosition === "bottom" ? "bottom-aligned" : ""}`}
          ref={menuRef}
          onMouseLeave={handleMenuLeave}
          {...menuAnimation}
        >
          {menuTitle && <div className="menu-title">{menuTitle}</div>}
          {menuItems.map((item, index) => {
            const locked = isItemLocked(item.minimumTier);
            return (
              <motion.div
                key={index}
                className={`menu-item ${locked ? "premium" : ""}`}
                whileTap={locked ? undefined : { scale: 0.95 }}
                whileHover={
                  locked
                    ? { backgroundColor: "rgba(var(--primary-rgb), 0.1)" }
                    : { backgroundColor: "rgba(255, 255, 255, 0.15)" }
                }
                onClick={(e) => handleItemClick(item, e)}
                aria-label={item.text}
              >
                <div className="menu-item-content">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
                {locked && (
                  <div className="premium-indicator">
                    <div className="premium-badge">
                      <FaCrown className="crown-icon" />
                      <span>PRO</span>
                    </div>
                    <div className="upgrade-tooltip">
                      <span>Upgrade to unlock</span>
                      <FaCrown className="crown-icon" />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SlidingMenu;
