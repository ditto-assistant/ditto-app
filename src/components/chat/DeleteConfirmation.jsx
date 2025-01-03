import React from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "../LoadingSpinner";

const DeleteConfirmation = ({
  memory,
  docId,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  return (
    <AnimatePresence>
      <motion.div
        className="delete-confirmation-overlay"
        onClick={onCancel}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="delete-confirmation-content"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="delete-confirmation-title">Delete Message?</div>
          <div className="delete-confirmation-message">
            Are you sure you want to delete this message? This action cannot be
            undone.
          </div>
          {isDeleting ? (
            <div className="delete-confirmation-loading">
              <LoadingSpinner size={24} inline={true} />
              <div>Deleting message...</div>
            </div>
          ) : (
            <>
              <div
                className={`delete-confirmation-docid ${
                  !docId ? "not-found" : ""
                }`}
              >
                Document ID: {docId || "Not found"}
              </div>
              <div className="delete-confirmation-buttons">
                <button
                  className="delete-confirmation-button cancel"
                  onClick={onCancel}
                >
                  Cancel
                </button>
                <button
                  className="delete-confirmation-button confirm"
                  onClick={onConfirm}
                  disabled={!docId}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

DeleteConfirmation.propTypes = {
  memory: PropTypes.shape({
    prompt: PropTypes.string,
    response: PropTypes.string,
  }).isRequired,
  docId: PropTypes.string,
  isDeleting: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default React.memo(DeleteConfirmation);
