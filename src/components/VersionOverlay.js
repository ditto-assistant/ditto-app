import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash } from "react-icons/fa";

const VersionOverlay = ({
  children,
  style,
  onDelete,
  onSelect,
  openUpward,
}) => {
  return ReactDOM.createPortal(
    <motion.div
      className="version-overlay"
      initial={{ opacity: 0, y: openUpward ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: openUpward ? 10 : -10 }}
      transition={{ duration: 0.2 }}
      style={{
        ...style,
        position: "fixed",
        zIndex: 1500,
        maxHeight: "200px",
        overflowY: "auto",
        backgroundColor: "#2B2D31",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        border: "1px solid #1E1F22",
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <AnimatePresence>
        {children.map((child, index) => {
          const versionMatch = child.match(/-v(\d+)$/);
          const version = versionMatch ? versionMatch[1] : null;
          const baseName = child.replace(/-v\d+$/, "");
          const isLatest = !version;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              whileHover={{
                backgroundColor: "rgba(88, 101, 242, 0.1)",
                paddingLeft: "24px",
                transition: { duration: 0.2 },
              }}
              style={styles.versionItem}
              onClick={() => onSelect && onSelect(child)}
            >
              <motion.span
                style={styles.versionName}
                whileHover={{ color: "#5865F2" }}
              >
                {baseName}
              </motion.span>
              {version && <span style={styles.versionBadge}>v{version}</span>}
              {isLatest && <span style={styles.latestBadge}>Latest</span>}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaTrash
                  style={styles.deleteIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(index);
                  }}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
};

const styles = {
  versionItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "#FFFFFF",
    transition: "all 0.2s ease",
    borderBottom: "1px solid #2B2D31",
    fontSize: "12px",
    height: "28px",
  },
  versionName: {
    flex: 1,
    transition: "color 0.2s ease",
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
    marginLeft: "8px",
    transition: "color 0.2s ease",
    fontSize: "14px",
  },
};

export default VersionOverlay;
