import { useState, useCallback } from "react";
import { deleteConversation } from "../control/memory";

// Utility function to log messages only in development mode
const logInDevelopment = (message, ...optionalParams) => {
  if (process.env.NODE_ENV === "development") {
    console.log(message, ...optionalParams);
  }
};

export const useMemoryDeletion = (updateConversation) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingMemories, setDeletingMemories] = useState(new Set());

  const deleteMemory = useCallback(
    async (userID, docId) => {
      try {
        logInDevelopment("Starting deletion for:", docId);
        setIsDeleting(true);
        setDeletingMemories((prev) => new Set([...prev, docId]));

        const success = await deleteConversation(userID, docId);

        if (success) {
          logInDevelopment("Deletion successful for:", docId);
          updateConversation((prevState) => ({
            ...prevState,
            messages: prevState.messages.filter((msg) => msg.pairID !== docId),
          }));

          const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
          const responses = JSON.parse(
            localStorage.getItem("responses") || "[]"
          );
          const timestamps = JSON.parse(
            localStorage.getItem("timestamps") || "[]"
          );
          const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");

          const pairIndex = pairIDs.indexOf(docId);
          if (pairIndex !== -1) {
            prompts.splice(pairIndex, 1);
            responses.splice(pairIndex, 1);
            timestamps.splice(pairIndex, 1);
            pairIDs.splice(pairIndex, 1);

            localStorage.setItem("prompts", JSON.stringify(prompts));
            localStorage.setItem("responses", JSON.stringify(responses));
            localStorage.setItem("timestamps", JSON.stringify(timestamps));
            localStorage.setItem("pairIDs", JSON.stringify(pairIDs));
            localStorage.setItem("histCount", pairIDs.length);
          }
        }
      } catch (error) {
        console.error("Error deleting memory:", error);
      } finally {
        setIsDeleting(false);
        setDeletingMemories((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
      }
    },
    [updateConversation]
  );

  return { isDeleting, deletingMemories, deleteMemory };
};
