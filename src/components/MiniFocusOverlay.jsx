import React from "react"
import { motion } from "framer-motion"

const darkModeColors = {
  primary: "#7289DA",
  text: "#FFFFFF",
}

function MiniFocusOverlay({ scriptName, onOverlayTrigger }) {
  return (
    <div style={styles.container}>
      <div style={styles.leftActions} />

      <motion.div style={styles.scriptInfo} onClick={onOverlayTrigger}>
        <span style={styles.scriptName} title={scriptName}>
          {scriptName}
        </span>
      </motion.div>

      <div style={styles.rightActions} />
    </div>
  )
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "0 8px",
    position: "relative",
    height: "60px",
  },
  leftActions: {
    minWidth: "40px",
    marginRight: "8px",
  },
  scriptInfo: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    maxWidth: "calc(100% - 100px)",
    padding: "0 4px",
  },
  scriptName: {
    color: darkModeColors.primary,
    fontSize: "16px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    textAlign: "center",
  },
  rightActions: {
    minWidth: "40px",
    marginLeft: "8px",
  },
}

export default MiniFocusOverlay
