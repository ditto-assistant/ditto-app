import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ModalButton } from "../buttons/ModalButton";
import "./ConfirmationDialog.css";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "primary",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirmation-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="confirmation-dialog-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirmation-dialog-header">
              <h2 className="confirmation-dialog-title">{title}</h2>
            </div>
            <div className="confirmation-dialog-body">
              <p className="confirmation-dialog-message">{message}</p>
            </div>
            <div className="confirmation-dialog-actions">
              <ModalButton variant="ghost" onClick={onClose}>
                {cancelLabel}
              </ModalButton>
              <ModalButton variant={variant} onClick={onConfirm}>
                {confirmLabel}
              </ModalButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
