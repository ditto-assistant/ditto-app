import { useState, useCallback } from "react";
import { MemoryStatus } from "../components/ui/modals/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useMemoryState = () => {
  const queryClient = useQueryClient();

  // Fetch memory status
  const {
    data: memoryStatus,
    isLoading,
    error,
  } = useQuery<MemoryStatus>({
    queryKey: ["memoryStatus"],
    queryFn: async () => {
      return {
        longTerm: JSON.parse(
          localStorage.getItem("deactivateLongTermMemory") || "false"
        ),
        shortTerm: JSON.parse(
          localStorage.getItem("deactivateShortTermMemory") || "false"
        ),
      };
    },
  });

  // Update memory status mutation
  const { mutate: updateMemoryStatus } = useMutation({
    mutationFn: async (newStatus: Partial<MemoryStatus>) => {
      Object.entries(newStatus).forEach(([key, value]) => {
        if (key === "longTerm") {
          localStorage.setItem(
            "deactivateLongTermMemory",
            JSON.stringify(value)
          );
          if (!value) localStorage.removeItem("longTermMemory");
        } else if (key === "shortTerm") {
          localStorage.setItem(
            "deactivateShortTermMemory",
            JSON.stringify(value)
          );
          if (!value) localStorage.removeItem("shortTermMemory");
        }
      });
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memoryStatus"] });
    },
  });

  // Delete all memory mutation
  const { mutate: deleteAllMemory, isLoading: isDeleting } = useMutation({
    mutationFn: async () => {
      localStorage.setItem("resetMemory", "true");
      const userID = localStorage.getItem("userID");
      localStorage.removeItem("prompts");
      localStorage.removeItem("responses");
      localStorage.removeItem("timestamps");
      localStorage.removeItem("pairIDs");
      localStorage.removeItem("histCount");

      // You would replace these with actual API calls
      // await resetConversation(userID);
      // await deleteAllUserImagesFromFirebaseStorageBucket(userID);

      window.dispatchEvent(
        new CustomEvent("memoryDeleted", {
          detail: { newHistCount: 0 },
        })
      );
    },
  });

  const toggleMemoryType = useCallback(
    (memoryType: keyof MemoryStatus) => {
      if (!memoryStatus) return;

      updateMemoryStatus({
        [memoryType]: !memoryStatus[memoryType],
      });
    },
    [memoryStatus, updateMemoryStatus]
  );

  return {
    memoryStatus,
    isLoading,
    error,
    isDeleting,
    toggleMemoryType,
    deleteAllMemory,
  };
};
