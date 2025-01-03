import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdArrowBack } from "react-icons/io";
import { FiDownload } from "react-icons/fi";

const ImageOverlay = ({ src, onClose, onDownload }) => {
  const [controlsVisible, setControlsVisible] = useState(true);

  const toggleControls = (e) => {
    e.stopPropagation();
    setControlsVisible(!controlsVisible);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="image-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="image-overlay-content"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <img src={src} alt="Full size" onClick={toggleControls} />
          <AnimatePresence>
            {controlsVisible && (
              <motion.div
                className="image-overlay-controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  className="image-control-button back"
                  onClick={onClose}
                  title="Back"
                >
                  <IoMdArrowBack />
                </button>
                <button
                  className="image-control-button download"
                  onClick={() => onDownload(src)}
                  title="Download"
                >
                  <FiDownload />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

ImageOverlay.propTypes = {
  src: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default React.memo(ImageOverlay);
