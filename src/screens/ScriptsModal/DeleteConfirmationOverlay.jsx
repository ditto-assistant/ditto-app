import { motion } from "framer-motion";
import { FaExclamationTriangle } from "react-icons/fa";

const DeleteConfirmationOverlay = ({
  isOpen,
  onClose,
  onConfirm,
  scriptName,
  isDeleteAll = false,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleModalClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={styles.overlay}
      onClick={handleOverlayClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={styles.modal}
        onClick={handleModalClick}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <FaExclamationTriangle style={styles.warningIcon} />
        <h3 style={styles.title}>Confirm Delete</h3>
        <p style={styles.message}>
          {isDeleteAll
            ? `Are you sure you want to delete "${scriptName}" and all its versions? This action cannot be undone.`
            : `Are you sure you want to delete "${scriptName}"? This action cannot be undone.`}
        </p>
        <div style={styles.buttons}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={styles.cancelButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={styles.deleteButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            Delete {isDeleteAll ? "All" : ""}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100003,
  },
  modal: {
    backgroundColor: "#2f3136",
    background: "linear-gradient(180deg, #2f3136 0%, #36393f 100%)",
    padding: "32px",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "480px",
    textAlign: "center",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  warningIcon: {
    color: "#DA373C",
    fontSize: "48px",
    marginBottom: "24px",
  },
  title: {
    color: "#FFFFFF",
    margin: "0 0 16px 0",
    fontSize: "24px",
    fontWeight: "600",
  },
  message: {
    color: "#B5BAC1",
    margin: "0 0 32px 0",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  buttons: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
  },
  cancelButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  deleteButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#DA373C",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
};

export default DeleteConfirmationOverlay;
