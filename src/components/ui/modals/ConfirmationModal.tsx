import React from "react";
import { BaseModal } from "@/components/ui/modals/BaseModal";
import { ModalButton } from "../buttons/ModalButton";
import { ConfirmationModalProps } from "./types";
import "./ConfirmationModal.css";

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "danger",
  ...props
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="400px"
      className="confirmation-modal"
      {...props}
    >
      <div className="confirmation-content">
        <p className="confirmation-message">{message}</p>
        <div className="confirmation-actions">
          <ModalButton
            variant="ghost"
            onClick={onClose}
            className="cancel-button"
          >
            {cancelLabel}
          </ModalButton>
          <ModalButton
            variant={variant}
            onClick={handleConfirm}
            className="confirm-button"
          >
            {confirmLabel}
          </ModalButton>
        </div>
      </div>
    </BaseModal>
  );
};
