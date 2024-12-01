import { motion } from "framer-motion";
import { FaCodeBranch, FaTrash } from "react-icons/fa";

const VersionsOverlay = ({
  isOpen,
  onClose,
  onSelect,
  onDelete,
  versions,
}) => {
  if (!isOpen) return null;

  // Sort versions: latest first, then descending order
  const sortedVersions = [...versions].sort((a, b) => {
    const aMatch = a.name.match(/-v(\d+)$/);
    const bMatch = b.name.match(/-v(\d+)$/);
    
    // If neither has a version number (latest), maintain current order
    if (!aMatch && !bMatch) return 0;
    
    // If one doesn't have a version number, it's latest and should be first
    if (!aMatch) return -1;
    if (!bMatch) return 1;
    
    // Otherwise sort by version number in descending order
    return parseInt(bMatch[1]) - parseInt(aMatch[1]);
  });

  return (
    <div className="modal-container" style={styles.modalContainer}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="versions-overlay-backdrop"
        style={styles.overlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="versions-overlay-content"
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          <FaCodeBranch style={styles.icon} />
          <h3 style={styles.title}>Script Versions</h3>
          <div style={styles.versionsContainer}>
            {sortedVersions.map((script, index) => {
              const versionMatch = script.name.match(/-v(\d+)$/);
              const version = versionMatch ? versionMatch[1] : null;
              const baseName = script.name.replace(/-v\d+$/, "");
              const isLatest = !version;

              return (
                <motion.div
                  key={index}
                  className="version-item"
                  style={styles.versionItem}
                  whileHover={{ backgroundColor: "rgba(88, 101, 242, 0.1)" }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(script);
                  }}
                >
                  <span style={styles.versionName}>{baseName}</span>
                  {version && <span style={styles.versionBadge}>v{version}</span>}
                  {isLatest && <span style={styles.latestBadge}>Latest</span>}
                  <motion.div
                    className="delete-button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(index);
                    }}
                  >
                    <FaTrash style={styles.deleteIcon} />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
          <div style={styles.buttons}>
            <motion.button
              className="cancel-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={styles.cancelButton}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

const styles = {
  modalContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000, // Higher than ScriptsOverlay
  },
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
    zIndex: 100001,
  },
  modal: {
    position: 'relative',
    zIndex: 100002,
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
  icon: {
    color: "#5865F2",
    fontSize: "48px",
    marginBottom: "24px",
  },
  title: {
    color: "#FFFFFF",
    margin: "0 0 24px 0",
    fontSize: "24px",
    fontWeight: "600",
  },
  versionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "300px",
    overflowY: "auto",
    marginBottom: "24px",
    padding: "4px",
  },
  versionItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  versionName: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: "14px",
    textAlign: "left",
  },
  versionBadge: {
    backgroundColor: "#5865F2",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    marginLeft: "8px",
  },
  latestBadge: {
    backgroundColor: "#28A745",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    marginLeft: "8px",
  },
  deleteIcon: {
    color: "#DA373C",
    cursor: "pointer",
    fontSize: "14px",
    marginLeft: "12px",
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
};

export default VersionsOverlay; 