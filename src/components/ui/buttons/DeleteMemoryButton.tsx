import React from "react"
import { Trash } from "lucide-react"
import { ModalButton } from "./ModalButton"
import {
  resetConversation,
  deleteAllUserImagesFromFirebaseStorageBucket,
} from "@/control/firebase"
import { useAuth } from "@/hooks/useAuth"
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog"

interface DeleteMemoryButtonProps {
  onSuccess?: () => void
  className?: string
  fixedWidth?: boolean
}

export const DeleteMemoryButton: React.FC<DeleteMemoryButtonProps> = ({
  onSuccess,
  className = "",
  fixedWidth,
}) => {
  const { user } = useAuth()
  const { showConfirmationDialog } = useConfirmationDialog()

  const handleDeleteMemory = async () => {
    console.log("Resetting conversation history...")
    if (!user?.uid) return
    await resetConversation(user?.uid)
    await deleteAllUserImagesFromFirebaseStorageBucket(user?.uid)
    onSuccess?.()
  }

  const handleOpenDialog = () => {
    showConfirmationDialog({
      title: "Delete All Memory",
      content:
        "Are you sure you want to delete all memory? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: handleDeleteMemory,
      variant: "destructive",
    })
  }

  return (
    <ModalButton
      variant="destructive"
      onClick={handleOpenDialog}
      className={className}
      icon={<Trash />}
      fixedWidth={fixedWidth}
    >
      Delete All Memory
    </ModalButton>
  )
}
