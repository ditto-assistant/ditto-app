import React, { useState, useRef, useCallback } from "react";
import { MdClose } from "react-icons/md";
import { FaBrain } from "react-icons/fa";
import { IoSettingsSharp, IoExtensionPuzzle } from "react-icons/io5";
import { ModalButton } from "@/components/ui/buttons/ModalButton";
import { DeleteMemoryButton } from "@/components/ui/buttons/DeleteMemoryButton";
import "./MemoryOverlay.css";
import ModelPreferencesModal from "@/components/ModelPreferencesModal";
import MemoryControlsModal from "@/components/MemoryControlsModal";
import AgentToolsModal from "@/components/AgentToolsModal";
import { motion, AnimatePresence } from "framer-motion";
import { ModalHeader } from "./ui/modals/ModalHeader";

enum ActiveModal {
  NONE,
  MODEL_PREFERENCES,
  MEMORY_CONTROLS,
  AGENT_TOOLS,
}

interface MemoryOverlayProps {
  closeOverlay: () => void;
}

export default function MemoryOverlay({ closeOverlay }: MemoryOverlayProps) {
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(ActiveModal.NONE);
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        overlayContentRef.current &&
        !overlayContentRef.current.contains(event.target as Node)
      ) {
        closeOverlay();
      }
    },
    [closeOverlay]
  );

  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const createModalHandler = useCallback(
    (modalType: ActiveModal) => () => {
      setActiveModal(modalType);
    },
    []
  );

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closeOverlay}
    >
      <motion.div
        ref={overlayContentRef}
        className="modal-content memory-modal"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title="Agent Settings" onClose={closeOverlay} />

        <div className="modal-body">
          <div className="settings-buttons">
            <ModalButton
              variant="secondary"
              icon={<IoSettingsSharp />}
              onClick={createModalHandler(ActiveModal.MODEL_PREFERENCES)}
              fullWidth
            >
              Model Preferences
            </ModalButton>

            <ModalButton
              variant="secondary"
              icon={<FaBrain />}
              onClick={createModalHandler(ActiveModal.MEMORY_CONTROLS)}
              fullWidth
            >
              Memory Controls
            </ModalButton>

            <ModalButton
              variant="secondary"
              icon={<IoExtensionPuzzle />}
              onClick={createModalHandler(ActiveModal.AGENT_TOOLS)}
              fullWidth
            >
              Agent Tools
            </ModalButton>

            <DeleteMemoryButton onSuccess={closeOverlay} />
          </div>
        </div>

        <AnimatePresence>
          {activeModal === ActiveModal.MODEL_PREFERENCES && (
            <ModelPreferencesModal
              onClose={createModalHandler(ActiveModal.NONE)}
            />
          )}

          {activeModal === ActiveModal.MEMORY_CONTROLS && (
            <MemoryControlsModal
              onClose={createModalHandler(ActiveModal.NONE)}
            />
          )}

          {activeModal === ActiveModal.AGENT_TOOLS && (
            <AgentToolsModal onClose={createModalHandler(ActiveModal.NONE)} />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
