import { useRef, useState, useEffect, lazy } from "react";
import { motion } from "framer-motion";
import { FaPlay, FaPen, FaTimes } from "react-icons/fa";
const FullScreenEditor = lazy(() => import("./FullScreenEditor"));
import "./ScriptActionsOverlay.css";

function ScriptActionsOverlay({
  scriptName,
  onPlay,
  onEdit,
  onDeselect,
  onClose,
  script, // This is the full script object
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const overlayContentRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);

    const handleClickOutside = (event) => {
      if (
        overlayContentRef.current &&
        !overlayContentRef.current.contains(event.target)
      ) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleDeselectClick = () => {
    if (onDeselect) {
      onDeselect();
    }
    handleClose();
  };

  const handleEdit = () => {
    setShowEditor(true);
    setIsVisible(false);
  };

  return (
    <>
      {!showEditor && (
        <div className={`ScriptActionsOverlay ${isVisible ? "visible" : ""}`}>
          <motion.div
            ref={overlayContentRef}
            className="ScriptActionsContent"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <button className="CloseButton" onClick={handleClose}>
              <FaTimes />
            </button>
            <div className="ScriptActionsHeader">
              <h3>Currently Selected Script</h3>
              <div className="ScriptNameContainer">
                <h2>{scriptName}</h2>
              </div>
            </div>
            <div className="ScriptActionsButtons">
              <motion.button
                className="EditButton"
                onClick={handleEdit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaPen className="button-icon" />
                Edit Script
              </motion.button>
              <motion.button
                className="LaunchButton"
                onClick={onPlay}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaPlay className="button-icon" />
                Launch Script
              </motion.button>
              <motion.button
                className="DeselectButton"
                onClick={handleDeselectClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Deselect Script
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {showEditor && script && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 5000,
            backgroundColor: "#1E1F22",
          }}
        >
          <FullScreenEditor
            script={{
              name: scriptName,
              content: script.content || "",
              scriptType: script.scriptType,
            }}
            onClose={() => {
              setShowEditor(false);
              handleClose();
            }}
            onSave={async (updatedContent) => {
              if (onEdit) {
                await onEdit(updatedContent);
              }
              setShowEditor(false);
              handleClose();
            }}
            theme="monokai"
            hideStatusIcons={true}
          />
        </div>
      )}
    </>
  );
}

export default ScriptActionsOverlay;
