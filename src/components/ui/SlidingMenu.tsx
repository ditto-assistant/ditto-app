import React, { useEffect, useRef } from "react"
import "./SlidingMenu.css"
import { useUser } from "@/hooks/useUser"
import { Crown } from "lucide-react"
import { useModal } from "@/hooks/useModal"
import { createPortal } from "react-dom"

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
  triggerRef?: React.RefObject<HTMLElement>
  menuTitle?: string
}

const SlidingMenu: React.FC<SlidingMenuProps> = ({
  menuItems,
  isOpen,
  onClose,
  triggerRef,
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

  // Render menu in a portal so it's positioned relative to viewport
  return createPortal(
    <div className={`sliding-menu-overlay ${isOpen ? "open" : ""}`}>
      <div ref={menuRef} className={`sliding-menu ${isOpen ? "open" : ""}`}>
        <div className="sliding-menu-header">
          <img src="/assets/logo.png" alt="Ditto" />
        </div>
        {menuTitle && <div className="menu-title">{menuTitle}</div>}
        {menuItems.map((item, index) => {
          const locked = isItemLocked(item.minimumTier)
          return (
            <div
              key={index}
              className={`menu-item ${locked ? "premium" : ""}`}
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
            </div>
          )
        })}
      </div>
      <div className="sliding-menu-backdrop" onClick={onClose} />
    </div>,
    document.body
  )
}

export default SlidingMenu
