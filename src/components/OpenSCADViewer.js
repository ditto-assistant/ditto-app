import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { IconButton } from "@mui/material";

const darkModeColors = {
  background: "#1E1F22",
  foreground: "#2B2D31",
  primary: "#5865F2",
  secondary: "#4752C4",
  text: "#FFFFFF",
  textSecondary: "#B5BAC1",
  border: "#1E1F22",
};

const OpenSCADViewer = ({ script, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.overlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={styles.container}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.header}>
            <h3 style={styles.title}>{script.name}</h3>
            <IconButton
              size="small"
              onClick={onClose}
              style={styles.closeButton}
            >
              <FaTimes size={16} color={darkModeColors.textSecondary} />
            </IconButton>
          </div>
          <pre style={styles.codeContainer}>
            <code style={styles.code}>{script.content}</code>
          </pre>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  container: {
    backgroundColor: darkModeColors.foreground,
    borderRadius: "12px",
    width: "90%",
    maxWidth: "800px",
    maxHeight: "80vh",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.24)",
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${darkModeColors.border}`,
  },
  header: {
    padding: "16px 24px",
    borderBottom: `1px solid ${darkModeColors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    color: darkModeColors.text,
    fontSize: "18px",
    fontWeight: 600,
  },
  closeButton: {
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },
  codeContainer: {
    padding: "24px",
    margin: 0,
    overflow: "auto",
    backgroundColor: darkModeColors.background,
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
    maxHeight: "calc(80vh - 70px)", // Subtract header height
  },
  code: {
    fontFamily: "monospace",
    fontSize: "14px",
    color: darkModeColors.text,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};

export default OpenSCADViewer;
