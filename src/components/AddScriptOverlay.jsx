import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@mui/material";
import { MdClose } from "react-icons/md";

const darkModeColors = {
  background: "#1E1F22",
  foreground: "#2B2D31",
  primary: "#5865F2",
  secondary: "#4752C4",
  text: "#FFFFFF",
  textSecondary: "#B5BAC1",
  border: "#1E1F22",
  danger: "#DA373C",
  cardBackground: "#313338",
  headerBackground: "#2B2D31",
  inputBackground: "#1E1F22",
};

const AddScriptOverlay = ({ isOpen, onClose, onSave, category }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.backdrop}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={styles.overlay}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.header}>
              <h3 style={styles.title}>
                New {category === "webApps" ? "Web App" : "OpenSCAD"} Script
              </h3>
              <MdClose style={styles.closeIcon} onClick={onClose} />
            </div>
            <div style={styles.content}>
              <input
                id={`${category}-name-input`}
                type="text"
                placeholder="Script Name"
                style={styles.input}
                autoFocus
              />
              <textarea
                id={`${category}-content-input`}
                placeholder="Script Content"
                style={{ ...styles.input, ...styles.textarea }}
              />
            </div>
            <div style={styles.actions}>
              <Button
                variant="contained"
                style={styles.cancelButton}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                style={styles.saveButton}
                onClick={onSave}
              >
                Save Script
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 10000,
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "auto",
  },
  overlay: {
    backgroundColor: darkModeColors.cardBackground,
    borderRadius: "12px",
    width: "90%",
    maxWidth: "600px",
    minHeight: "400px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    zIndex: 10001,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    position: "relative",
    overflow: "hidden",
    margin: "0 auto",
    "@media (max-height: 600px)": {
      minHeight: "300px",
      maxHeight: "85vh",
    },
  },
  header: {
    padding: "20px",
    borderBottom: `1px solid ${darkModeColors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: darkModeColors.cardBackground,
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  title: {
    margin: 0,
    color: darkModeColors.text,
    fontSize: "1.2em",
    fontWeight: "600",
  },
  closeIcon: {
    color: darkModeColors.textSecondary,
    fontSize: "24px",
    cursor: "pointer",
    transition: "color 0.2s ease",
    "&:hover": {
      color: darkModeColors.text,
    },
  },
  content: {
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
    minHeight: 0,
    paddingBottom: "80px",
    "@media (max-height: 600px)": {
      padding: "16px",
      gap: "12px",
      paddingBottom: "70px",
    },
  },
  input: {
    backgroundColor: darkModeColors.inputBackground,
    border: `1px solid ${darkModeColors.border}`,
    borderRadius: "8px",
    padding: "12px",
    color: darkModeColors.text,
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease",
    "&:focus": {
      borderColor: darkModeColors.primary,
    },
  },
  textarea: {
    minHeight: "200px",
    height: "100%",
    resize: "none",
    fontFamily: "monospace",
    flex: 1,
  },
  actions: {
    padding: "20px",
    borderTop: `1px solid ${darkModeColors.border}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    backgroundColor: darkModeColors.cardBackground,
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  saveButton: {
    backgroundColor: darkModeColors.primary,
    "&:hover": {
      backgroundColor: darkModeColors.secondary,
    },
  },
  cancelButton: {
    backgroundColor: "transparent",
    color: darkModeColors.text,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },
};

export default AddScriptOverlay;
