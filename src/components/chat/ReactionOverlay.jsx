import React from "react";
import PropTypes from "prop-types";

const EMOJIS = ["❤️", "👍", "👎", "😠", "😢", "😂", "❗"];

const ReactionOverlay = ({ position, onReact }) => {
  const adjustOverlayPosition = (left, top) => {
    const overlay = document.querySelector(".reaction-overlay");
    if (!overlay) return { left, top };

    const rect = overlay.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedLeft = left;
    let adjustedTop = top;

    if (left + rect.width > viewportWidth) {
      adjustedLeft = viewportWidth - rect.width;
    }
    if (left < 0) {
      adjustedLeft = 0;
    }
    if (top + rect.height > viewportHeight) {
      adjustedTop = viewportHeight - rect.height;
    }
    if (top < 0) {
      adjustedTop = 0;
    }

    return { left: adjustedLeft, top: adjustedTop };
  };

  const adjustedPosition = adjustOverlayPosition(position.x, position.y);

  return (
    <div
      className="reaction-overlay"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        ...adjustedPosition,
        transform: "translate(-50%, -50%)",
      }}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="emoji-button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

ReactionOverlay.propTypes = {
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  onReact: PropTypes.func.isRequired,
};

export default React.memo(ReactionOverlay);
