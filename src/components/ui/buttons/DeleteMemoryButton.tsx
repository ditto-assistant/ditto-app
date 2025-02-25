import React, { useCallback } from "react";
import { FaTrash } from "react-icons/fa";
import { ModalButton } from "./ModalButton";
import { motion } from "framer-motion";
import {
  resetConversation,
  deleteAllUserImagesFromFirebaseStorageBucket,
} from "@/control/firebase";
import { useAuth } from "@/hooks/useAuth";
interface DeleteMemoryButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export const DeleteMemoryButton: React.FC<DeleteMemoryButtonProps> = ({
  onSuccess,
  className = "",
}) => {
  const { user } = useAuth();
  const deleteAllMemory = useCallback(async () => {
    const dialog = document.createElement("div");
    dialog.className = "confirmation-dialog";
    dialog.innerHTML = `
      <div class="confirmation-content">
        <h3>Delete All Memory</h3>
        <p>Are you sure you want to delete all memory? This action cannot be undone.</p>
        <div class="confirmation-buttons">
          <button class="cancel-button">Cancel</button>
          <button class="confirm-button">Delete</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    setTimeout(() => dialog.classList.add("visible"), 50);

    return new Promise<boolean>((resolve) => {
      const handleCancel = () => {
        dialog.classList.remove("visible");
        setTimeout(() => dialog.remove(), 300);
        resolve(false);
      };

      const handleConfirm = async () => {
        dialog.classList.remove("visible");
        setTimeout(() => dialog.remove(), 300);
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
          })
        );

        onSuccess?.();
        resolve(true);
      };

      dialog
        .querySelector(".cancel-button")
        ?.addEventListener("click", handleCancel);
      dialog
        .querySelector(".confirm-button")
        ?.addEventListener("click", handleConfirm);
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) handleCancel();
      });
    });
  }, [onSuccess, user?.uid]);

  return (
    <motion.div
      className={`memory-manager ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="card-header">
        <FaTrash className="card-icon" />
        <h4>Memory Manager</h4>
      </div>
      <ModalButton variant="danger" onClick={deleteAllMemory} fullWidth>
        Delete All Memory
      </ModalButton>
    </motion.div>
  );
};
