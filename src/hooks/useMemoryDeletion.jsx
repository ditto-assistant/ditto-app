import { useCallback } from "react"
import { deleteConversationComplete } from "@/api/userContent"
import { useConfirmationDialog } from "./useConfirmationDialog"
import { toast } from "sonner"
import { useAuth } from "./useAuth"

export const useMemoryDeletion = (updateConversation) => {
  const { showConfirmationDialog } = useConfirmationDialog()
  const { user } = useAuth()

  const deleteMemory = useCallback(
    async (docId, options = {}) => {
      if (!user.uid) return
      if (!docId) return
      try {
        const toastId = toast.loading("Deleting memory...")

        // Use the new complete deletion that handles both Firestore and KG
        const result = await deleteConversationComplete(user.uid, docId)

        if (!(result instanceof Error)) {
          // Show success message with cleanup stats if available
          let successMessage = "Memory deleted successfully"
          if (result.kg_cleanup && result.kg_cleanup.cleanup_stats) {
            const stats = result.kg_cleanup.cleanup_stats
            const cleanupDetails = []
            if (stats.pairs_deleted > 0)
              cleanupDetails.push(`${stats.pairs_deleted} pairs`)
            if (stats.subjects_removed > 0)
              cleanupDetails.push(`${stats.subjects_removed} subjects`)
            if (stats.links_removed > 0)
              cleanupDetails.push(`${stats.links_removed} links`)

            if (cleanupDetails.length > 0) {
              successMessage += ` (cleaned: ${cleanupDetails.join(", ")})`
            }
          }

          toast.success(successMessage, { id: toastId })

          if (updateConversation) {
            updateConversation((prevState) => ({
              ...prevState,
              messages: prevState.messages.filter(
                (msg) => msg.pairID !== docId
              ),
            }))
          }

          window.dispatchEvent(new Event("memoryUpdated"))

          if (options.onSuccess) {
            options.onSuccess(docId)
          }
        } else {
          toast.error(result.message || "Failed to delete memory", {
            id: toastId,
          })
          if (options.onError) {
            options.onError(result)
          }
        }
      } catch (error) {
        console.error("Error deleting memory:", error)
        toast.error("Failed to delete memory")
        if (options.onError) {
          options.onError(error)
        }
      }
    },
    [updateConversation, user]
  )

  const confirmMemoryDeletion = useCallback(
    (docId, options = {}) => {
      if (!user.uid) return
      const title = "Delete Memory?"
      const content =
        "Are you sure you want to delete this memory? This will permanently remove it from your memory collection and clean up any orphaned subjects in your knowledge graph. This action cannot be undone."

      showConfirmationDialog({
        title,
        content: (
          <>
            <div>{content}</div>
            {docId && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "0.85rem",
                  opacity: 0.7,
                  padding: "6px 10px",
                  background: "rgba(0, 0, 0, 0.2)",
                  borderRadius: "4px",
                }}
              >
                Document ID: {docId}
              </div>
            )}
          </>
        ),
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
        onConfirm: () => deleteMemory(docId, options),
      })
    },
    [showConfirmationDialog, deleteMemory, user]
  )

  return {
    deleteMemory,
    confirmMemoryDeletion,
  }
}
