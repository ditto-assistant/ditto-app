import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_MODAL_STATE, ModalId, useModal } from "@/hooks/useModal";
import { ModalHeader } from "./ModalHeader";
import { motion } from "framer-motion";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";
import { ModalButton } from "../buttons/ModalButton";
import { usePlatform } from "@/hooks/usePlatform";

const id: ModalId = "confirmationDialog";

export default function ConfirmationModal() {
  const { getModalState, createCloseHandler } = useModal();
  const { config, hideConfirmationDialog } = useConfirmationDialog();
  const { isMobile } = usePlatform();
  const closeModal = createCloseHandler(id);
  const { isOpen, zIndex } = getModalState(id) ?? DEFAULT_MODAL_STATE;

  const handleCancel = () => {
    if (config?.onCancel) {
      config.onCancel();
    }
    closeModal();
    hideConfirmationDialog();
  };

  const handleConfirm = () => {
    if (config?.onConfirm) {
      config.onConfirm();
    }
    closeModal();
    hideConfirmationDialog();
  };

  if (!isOpen || !config) return null;

  return createPortal(
    <motion.div
      className="confirmation-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="confirmation-modal-container"
        style={{ zIndex }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="confirmation-modal-content">
          <ModalHeader
            title={config.title}
            onClose={handleCancel}
            className=""
            isFullscreen={false}
          />
          <div className="confirmation-modal-body">
            <div className="confirmation-modal-message">{config.content}</div>
            <div className="confirmation-modal-buttons">
              <ModalButton variant="secondary" onClick={handleCancel}>
                {config.cancelLabel || "Cancel"}
              </ModalButton>
              <ModalButton
                variant={config.variant || "primary"}
                onClick={handleConfirm}
              >
                {config.confirmLabel || "Confirm"}
              </ModalButton>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.getElementById("modal-root")!,
  );
}
