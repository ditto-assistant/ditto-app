import React from "react";
import PropTypes from "prop-types";
import { FaBrain, FaTrash } from "react-icons/fa";

const ActionOverlay = ({
  position,
  onCopy,
  onReact,
  onShowMemories,
  onDelete,
  loadingMemories,
}) => {
  return (
    <div
      className="action-overlay"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <button onClick={onCopy} className="action-button">
        Copy
      </button>
      <button onClick={onReact} className="action-button">
        React
      </button>
      <button
        onClick={onShowMemories}
        className="action-button"
        disabled={loadingMemories}
      >
        <FaBrain style={{ marginRight: "5px" }} />
        {loadingMemories ? "Loading..." : "Memories"}
      </button>
      <button onClick={onDelete} className="action-button delete-action">
        <FaTrash style={{ marginRight: "5px" }} />
        Delete
      </button>
    </div>
  );
};

ActionOverlay.propTypes = {
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  onCopy: PropTypes.func.isRequired,
  onReact: PropTypes.func.isRequired,
  onShowMemories: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  loadingMemories: PropTypes.bool,
};

export default React.memo(ActionOverlay);
