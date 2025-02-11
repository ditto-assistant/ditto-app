import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "../hooks/useIsMobile";

const CardMenu = ({ children, style, onDelete }) => {
  const { transformOrigin, ...restStyle } = style;
  const isMobile = useIsMobile();
  const [shouldOpenUpward, setShouldOpenUpward] = useState(false);

  useEffect(() => {
    const viewportMidpoint = window.innerHeight / 2;
    const triggerPosition = style.top;
    setShouldOpenUpward(triggerPosition > viewportMidpoint);
  }, [style.top]);

  const menuItems = React.Children.toArray(children).filter(Boolean);
  const orderedItems = menuItems;

  const menuWidth = isMobile ? 160 : 140;
  const leftPosition = style.left - menuWidth - 8;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        className="card-menu"
        initial={{
          opacity: 0,
          scale: 0.95,
          y: shouldOpenUpward ? 10 : -10,
        }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{
          opacity: 0,
          scale: 0.95,
          y: shouldOpenUpward ? 10 : -10,
        }}
        transition={{ duration: 0.2 }}
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
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {orderedItems.map((child, index) => {
          if (!child) return null;

          if (
            React.isValidElement(child) &&
            child.type === "div" &&
            child.props?.style?.height === "1px"
          ) {
            return (
              <div
                key={`divider-${index}`}
                style={{
                  height: "1px",
                  backgroundColor: "#1E1F22",
                  margin: isMobile ? "4px 0" : "2px 0",
                }}
              />
            );
          }

          return (
            <motion.div
              key={index}
              whileHover={{
                backgroundColor: "rgba(88, 101, 242, 0.1)",
                paddingLeft: isMobile ? "14px" : "12px",
              }}
              transition={{ duration: 0.2 }}
              style={{
                width: "100%",
                padding: isMobile ? "8px 12px" : "5px 8px",
                cursor: "pointer",
                boxSizing: "border-box",
                fontSize: isMobile ? "14px" : "12px",
                color: "#B5BAC1",
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "8px" : "4px",
                borderRadius: "4px",
                height: isMobile ? "40px" : "28px",
                marginBottom: isMobile ? "3px" : "2px",
                ...(index === orderedItems.length - 1 && {
                  marginTop: "0",
                  marginBottom: "0",
                }),
              }}
              onClick={() => {
                if (child.props.onClick) {
                  child.props.onClick();
                }
                if (child.props.children === "Delete" && onDelete) {
                  onDelete();
                }
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default CardMenu;
