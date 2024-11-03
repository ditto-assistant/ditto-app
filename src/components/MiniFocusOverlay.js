import React from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaPen } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

const darkModeColors = {
  primary: '#7289DA',
  text: '#FFFFFF',
};

function MiniFocusOverlay({ scriptName, onEdit, onPlay, onDeselect }) {
  return (
    <div style={styles.container}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={styles.actionButton}
        onClick={onEdit}
      >
        <FaPen size={16} />
      </motion.button>
      
      <motion.div
        style={styles.scriptInfo}
        onClick={onPlay}
      >
        <span style={styles.scriptName}>{scriptName}</span>
      </motion.div>

      <div style={styles.rightActions}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={styles.actionButton}
          onClick={onPlay}
        >
          <FaPlay size={16} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={styles.actionButton}
          onClick={onDeselect}
        >
          <MdClose size={18} />
        </motion.button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 10px',
    position: 'relative',
  },
  scriptInfo: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  scriptName: {
    color: darkModeColors.primary,
    fontSize: '16px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  actionButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: darkModeColors.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
  },
};

export default MiniFocusOverlay; 