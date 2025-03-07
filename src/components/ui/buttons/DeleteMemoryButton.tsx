import React from "react";
import { FaTrash } from "react-icons/fa";
import { ModalButton } from "./ModalButton";
import {
  resetConversation,
  deleteAllUserImagesFromFirebaseStorageBucket,
} from "@/control/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";

interface DeleteMemoryButtonProps {
  onSuccess?: () => void;
  className?: string;
  fixedWidth?: boolean;
}

export const DeleteMemoryButton: React.FC<DeleteMemoryButtonProps> = ({
  onSuccess,
  className = "",
  fixedWidth,
}) => {
  const { user } = useAuth();
  const { showConfirmationDialog } = useConfirmationDialog();

  const handleDeleteMemory = async () => {
    console.log("Resetting conversation history...");
    localStorage.setItem("resetMemory", "true");
    if (!user?.uid) return;

    localStorage.removeItem("prompts");
    localStorage.removeItem("responses");
    localStorage.removeItem("timestamps");
    localStorage.removeItem("pairIDs");
    localStorage.removeItem("histCount");

    await resetConversation(user?.uid);
    await deleteAllUserImagesFromFirebaseStorageBucket(user?.uid);

    window.dispatchEvent(
      new CustomEvent("memoryDeleted", {
        detail: { newHistCount: 0 },
      }),
    );

    onSuccess?.();
  };

  const handleOpenDialog = () => {
    showConfirmationDialog({
      title: "Delete All Memory",
      content:
        "Are you sure you want to delete all memory? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: handleDeleteMemory,
      variant: "danger",
    });
  };

  return (
    <ModalButton
      variant="danger"
      onClick={handleOpenDialog}
      className={className}
      icon={<FaTrash />}
      fixedWidth={fixedWidth}
    >
      Delete All Memory
    </ModalButton>
  );
};
