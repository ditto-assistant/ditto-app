import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom"
import { usePlatform } from "@/hooks/usePlatform"

const CardMenu = ({ children, style, onDelete }) => {
  const { ...restStyle } = style
  const { isMobile } = usePlatform()
  const [shouldOpenUpward, setShouldOpenUpward] = useState(false)

  useEffect(() => {
    const viewportMidpoint = window.innerHeight / 2
    const triggerPosition = style.top
    setShouldOpenUpward(triggerPosition > viewportMidpoint)
  }, [style.top])

  const menuItems = React.Children.toArray(children).filter(Boolean)
  const orderedItems = menuItems

  const menuWidth = isMobile ? 160 : 140
  const leftPosition = style.left - menuWidth - 8

  return ReactDOM.createPortal(
    <div
      className="card-menu"
      style={{
        ...restStyle,
        position: "fixed",
        left: leftPosition,
        zIndex: 99990,
        backgroundColor: "#2B2D31",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        border: "1px solid #1E1F22",
        overflow: "hidden",
        minWidth: isMobile ? "160px" : "140px",
        transformOrigin: shouldOpenUpward ? "bottom" : "top",
        padding: isMobile ? "6px" : "4px",
        ...(shouldOpenUpward && {
          top: "auto",
          bottom: window.innerHeight - style.top + 8,
        }),
      }}
    >
      {orderedItems.map((item, index) => (
        <div
          key={index}
          className="card-menu-item"
          onClick={item.props.onClick}
        >
          {item.props.children}
        </div>
      ))}
      {onDelete && (
        <div className="card-menu-item delete" onClick={onDelete}>
          Delete
        </div>
      )}
    </div>,
    document.getElementById("modal-root")
  )
}

export default CardMenu
