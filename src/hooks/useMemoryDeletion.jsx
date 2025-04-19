import { useCallback } from "react"
import { deleteConversation } from "../control/memory"
import { useConfirmationDialog } from "./useConfirmationDialog"
import toast from "react-hot-toast"
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
        const success = await deleteConversation(user.uid, docId)

        if (success) {
          toast.success("Memory deleted successfully", { id: toastId })

          if (updateConversation) {
            updateConversation((prevState) => ({
              ...prevState,
              messages: prevState.messages.filter(
                (msg) => msg.pairID !== docId
              ),
            }))

            const prompts = JSON.parse(localStorage.getItem("prompts") || "[]")
            const responses = JSON.parse(
              localStorage.getItem("responses") || "[]"
            )
            const timestamps = JSON.parse(
              localStorage.getItem("timestamps") || "[]"
            )
            const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]")

            const pairIndex = pairIDs.indexOf(docId)
            if (pairIndex !== -1) {
              prompts.splice(pairIndex, 1)
              responses.splice(pairIndex, 1)
              timestamps.splice(pairIndex, 1)
              pairIDs.splice(pairIndex, 1)

              localStorage.setItem("prompts", JSON.stringify(prompts))
              localStorage.setItem("responses", JSON.stringify(responses))
              localStorage.setItem("timestamps", JSON.stringify(timestamps))
              localStorage.setItem("pairIDs", JSON.stringify(pairIDs))
              localStorage.setItem("histCount", pairIDs.length)
            }
          }

          window.dispatchEvent(new Event("memoryUpdated"))

          if (options.onSuccess) {
            options.onSuccess(docId)
          }
        }
      } catch (error) {
        console.error("Error deleting memory:", error)
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
      const isMessage = !!options.isMessage
      const title = isMessage ? "Delete Message?" : "Delete Memory?"
      const content = isMessage
        ? "Are you sure you want to delete this message? This action cannot be undone."
        : "Are you sure you want to delete this memory? This action cannot be undone."

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
