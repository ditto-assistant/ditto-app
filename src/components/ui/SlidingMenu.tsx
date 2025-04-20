import React, { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./SlidingMenu.css"
import { useUser } from "@/hooks/useUser"
import { Crown } from "lucide-react"
import { useModal } from "@/hooks/useModal"

interface MenuItem {
  icon: React.ReactNode
  text: string
  onClick: () => void
  minimumTier?: number
}

interface SlidingMenuProps {
  menuItems: MenuItem[]
  isOpen: boolean
  onClose: () => void
  position?: "left" | "right" | "center"
  triggerRef?: React.RefObject<HTMLElement>
  menuPosition?: "top" | "bottom"
  menuTitle?: string
}

const SlidingMenu: React.FC<SlidingMenuProps> = ({
  menuItems,
  isOpen,
  onClose,
  position = "left",
  triggerRef,
  menuPosition = "top",
  menuTitle,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const { data: user } = useUser()
  const { createOpenHandler } = useModal()

  const isItemLocked = (minimumTier?: number) => {
    if (!minimumTier) return false
    const userTier = user?.planTier || 0
    return userTier < minimumTier
  }

  const handleItemClick = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isItemLocked(item.minimumTier)) {
      // Create a new handler with the general tab specified
      const openSettingsWithGeneralTab = createOpenHandler(
        "settings",
        "general"
      )
      openSettingsWithGeneralTab()
    } else {
      item.onClick()
      onClose()
    }
  }

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
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose, triggerRef])

  const getMenuAnimation = () => {
    // For bottom-aligned menus, animate vertically
    if (menuPosition === "bottom") {
      return {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.15 },
      }
    }

    // For standard top menus, animate horizontally
    const initialX = position === "left" ? -20 : 20
    return {
      initial: { opacity: 0, x: initialX },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: initialX },
      transition: { duration: 0.15 },
    }
  }

  const menuAnimation = getMenuAnimation()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`sliding-menu ${position === "right" ? "right-aligned" : ""} ${position === "center" ? "center-aligned" : ""} ${menuPosition === "bottom" ? "bottom-aligned" : ""}`}
          ref={menuRef}
          {...menuAnimation}
        >
          {menuTitle && <div className="menu-title">{menuTitle}</div>}
          {menuItems.map((item, index) => {
            const locked = isItemLocked(item.minimumTier)
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
                      <Crown className="crown-icon" />
                      <span>PRO</span>
                    </div>
                    <div className="upgrade-tooltip">
                      <span>Upgrade to unlock</span>
                      <Crown className="crown-icon" />
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SlidingMenu
