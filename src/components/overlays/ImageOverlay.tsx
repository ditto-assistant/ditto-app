import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdArrowBack } from "react-icons/io";
import { FiDownload } from "react-icons/fi";

interface ImageOverlayProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageOverlay = memo(({ imageUrl, onClose }: ImageOverlayProps) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  if (!imageUrl) return null;
  const handleDownload = () => {
    window.open(imageUrl, "_blank");
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
          <img
            src={imageUrl}
            alt="Full size"
            onClick={() => setControlsVisible(!controlsVisible)}
          />
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
                  onClick={handleDownload}
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
});
