import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth, useAuthToken } from "./useAuth";
import { BASE_URL } from "@/firebaseConfig";
import { Memory } from "@/api/getMemories";

interface ConversationResponse {
  messages: Memory[];
  nextCursor: string;
}

interface OptimisticMemory extends Memory {
  isOptimistic?: boolean;
  streamingResponse?: string;
  imageURL?: string;
}

interface ConversationContextType {
  messages: OptimisticMemory[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  addOptimisticMessage: (userPrompt: string, imageURL?: string) => string;
  updateOptimisticResponse: (pairId: string, responseChunk: string) => void;
  finalizeOptimisticMessage: (
    pairId: string,
    finalResponse: string,
    forceRemove?: boolean
  ) => void;
  clearOptimisticMessages: () => void;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tok = useAuthToken();
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMemory[]
  >([]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<ConversationResponse>({
    queryKey: ["conversations", user?.uid, tok.data],
    queryFn: async ({ pageParam }) => {
      if (!tok.data) {
        throw new Error("No token found");
      }
      if (!user?.uid) {
        throw new Error("No user ID found");
      }
      const params = new URLSearchParams({
        userId: user?.uid || "",
        limit: "5",
      });
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }
      const response = await fetch(`${BASE_URL}/v1/conversations?${params}`, {
        headers: {
          Authorization: `Bearer ${tok.data}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      return response.json() as Promise<ConversationResponse>;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage: ConversationResponse) =>
      lastPage.nextCursor || undefined,
    enabled: !!user?.uid && !!tok.data,
  });

  // Memoize server messages to prevent unnecessary re-renders
  const serverMessages = useMemo(
    () => data?.pages.flatMap((page) => page.messages) || [],
    [data?.pages]
  );

  // Enhanced debug logging for message state (disabled in production)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && (serverMessages.length > 0 || optimisticMessages.length > 0)) {
      console.log("📊 [Messages State]", {
        serverMessageCount: serverMessages.length,
        optimisticMessageCount: optimisticMessages.length,
      });
    }
  }, [serverMessages, optimisticMessages]);

  // Keep track of which messages have been finalized to avoid premature cleanup
  // This only removes optimistic messages that have been fully finalized and saved to server
  useEffect(() => {
    // Skip if we don't have both types of messages
    if (serverMessages.length === 0 || optimisticMessages.length === 0) {
      return;
    }

    // If we have any non-finalized optimistic messages, don't do cleanup yet
    // This ensures tool responses stay visible during processing
    const hasActiveOptimisticMessages = optimisticMessages.some(
      (msg) => msg.isOptimistic === true
    );
    if (hasActiveOptimisticMessages) {
      console.log(
        "🔄 [Cleanup] Skipping cleanup - active optimistic messages exist"
      );
      return;
    }

    console.log(
      "🔄 [Cleanup] Checking for finalized messages to clean up after server update"
    );

    // Find and remove optimistic messages that have been finalized and saved to server
    // Only remove finalized messages (isOptimistic === false) that exist on the server
    const messagesToRemove = optimisticMessages.filter(
      (optMsg) =>
        // Only consider non-optimistic messages for removal
        optMsg.isOptimistic === false &&
        // And only if they exist on the server
        serverMessages.some((serverMsg) => serverMsg.prompt === optMsg.prompt)
    );

    if (messagesToRemove.length > 0) {
      console.log(
        `🧹 [Cleanup] Removing ${messagesToRemove.length} finalized messages that exist on server`
      );
      setOptimisticMessages((prev) =>
        prev.filter(
          (msg) => !messagesToRemove.some((toRemove) => toRemove.id === msg.id)
        )
      );
    }
  }, [serverMessages, optimisticMessages]);

  // Cleanup stale optimistic messages
  useEffect(() => {
    // Only run if we have optimistic messages
    if (optimisticMessages.length > 0) {
      // Look for optimistic messages that are older than 2 minutes
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

      const staleMessages = optimisticMessages.filter((msg) => {
        // Check if message is older than 2 minutes and still marked as optimistic
        const isStale =
          msg.isOptimistic === true &&
          (msg.timestamp ? msg.timestamp.getTime() : 0) < twoMinutesAgo;
        if (isStale) {
          console.log("🧹 [Cleanup] Found stale optimistic message:", {
            id: msg.id,
            age:
              Math.floor(
                (Date.now() - (msg.timestamp ? msg.timestamp.getTime() : 0)) /
                  1000
              ) + "s",
          });
        }
        return isStale;
      });

      // If we have stale messages, remove them
      if (staleMessages.length > 0) {
        console.log(
          `🧹 [Cleanup] Removing ${staleMessages.length} stale optimistic messages`
        );
        setOptimisticMessages((prev) =>
          prev.filter(
            (msg) => !staleMessages.some((stale) => stale.id === msg.id)
          )
        );
      }

      // Also remove finalized messages after they've been in the array for a while
      // This helps clean up the transition state
      const finalizedTimeout = Date.now() - 30 * 1000; // 30 seconds
      const finalizedMessages = optimisticMessages.filter((msg) => {
        return (
          msg.isOptimistic === false &&
          (msg.timestamp ? msg.timestamp.getTime() : 0) < finalizedTimeout
        );
      });

      if (finalizedMessages.length > 0) {
        console.log(
          `🧹 [Cleanup] Removing ${finalizedMessages.length} finalized transitional messages`
        );
        setOptimisticMessages((prev) =>
          prev.filter(
            (msg) => !finalizedMessages.some((final) => final.id === msg.id)
          )
        );
      }
    }
  }, [optimisticMessages]);

  // Filter out optimistic messages that have been persisted to the server
  // More aggressive filtering to prevent duplicates
  const filteredOptimisticMessages = optimisticMessages.filter((optMsg) => {
    // Keep non-optimistic messages in the list temporarily (they'll be removed after a refetch cycle)
    if (optMsg.isOptimistic === false) {
      // If we've marked it as no longer optimistic but it's still in our array,
      // keep it for this render cycle to prevent flickering
      console.log(
        "🔄 [Filtering] Keeping finalized message in optimistic array",
        { id: optMsg.id }
      );
      return true;
    }

    // Check if this optimistic message has been persisted to the server
    const matchingServerMsg = serverMessages.find((serverMsg) => {
      // Match only by exact ID (not by content)
      // This ensures uniquely generated message IDs don't get filtered out
      if (serverMsg.id === optMsg.id) {
        console.log("🔍 [Filtering] Removing optimistic message - ID match", {
          id: optMsg.id,
        });
        return true;
      }

      return false;
    });

    return !matchingServerMsg;
  });

  // Combine server and optimistic messages, with optimistic messages at the beginning (most recent)
  const messages = [...filteredOptimisticMessages, ...serverMessages];

  // Add a new optimistic message pair (user prompt + empty assistant response)
  const addOptimisticMessage = useCallback(
    (userPrompt: string, imageURL?: string): string => {
      const timestamp = Date.now();
      const tempPairId = `optimistic-${timestamp}`;

      console.log("🌟 [OptimisticUpdate] Adding optimistic message", {
        tempPairId,
        userPrompt:
          userPrompt.substring(0, 50) + (userPrompt.length > 50 ? "..." : ""),
        hasImage: !!imageURL,
      });

      const newOptimisticMessages: OptimisticMemory[] = [
        {
          id: tempPairId,
          prompt: userPrompt,
          response: "",
          timestamp: new Date(timestamp),
          isOptimistic: true,
          streamingResponse: "",
          imageURL,
          score: 0,
          vector_distance: 0,
          depth: 0,
        },
      ];

      setOptimisticMessages((prev) => [...newOptimisticMessages, ...prev]);
      return tempPairId;
    },
    []
  );

  // Update the streaming response of an optimistic message
  const updateOptimisticResponse = useCallback(
    (pairId: string, responseChunk: string) => {
      console.log("🌊 [OptimisticUpdate] Streaming chunk received", {
        pairId,
        chunkLength: responseChunk.length,
        chunkPreview:
          responseChunk.substring(0, 20) +
          (responseChunk.length > 20 ? "..." : ""),
      });

      setOptimisticMessages((prev) => {
        const messageExists = prev.some((msg) => msg.id === pairId);
        if (!messageExists) {
          console.warn(
            "⚠️ [OptimisticUpdate] No message found with ID:",
            pairId
          );
          return prev;
        }

        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                streamingResponse:
                  (msg.streamingResponse || "") + responseChunk,
                response: (msg.streamingResponse || "") + responseChunk,
              }
            : msg
        );
      });
    },
    []
  );

  // Finalize an optimistic message by setting its final response
  // For tool-based responses, we want to maintain the optimistic state until we get the final tool response
  const finalizeOptimisticMessage = useCallback(
    (pairId: string, finalResponse: string, forceRemove = false) => {
      // Handle force remove signal from tool completion
      if (forceRemove) {
        console.log(`🧹 [OptimisticUpdate] Force removing message: ${pairId}`);
        setOptimisticMessages((prev) =>
          prev.filter((msg) => msg.id !== pairId)
        );
        return;
      }

      console.log("✅ [OptimisticUpdate] Finalizing message", {
        pairId,
        responseLength: finalResponse.length,
        responsePreview:
          finalResponse.substring(0, 30) +
          (finalResponse.length > 30 ? "..." : ""),
        hasToolMarker:
          finalResponse.includes("<OPENSCAD>") ||
          finalResponse.includes("<HTML_SCRIPT>") ||
          finalResponse.includes("<IMAGE_GENERATION>") ||
          finalResponse.includes("<GOOGLE_SEARCH>"),
      });

      setOptimisticMessages((prev) => {
        const messageExists = prev.some((msg) => msg.id === pairId);
        if (!messageExists) {
          console.warn(
            "⚠️ [OptimisticUpdate] No message found to finalize with ID:",
            pairId
          );
          return prev;
        }

        // Check if this is a tool response that needs to stay visible during processing
        const hasTool =
          finalResponse.includes("<OPENSCAD>") ||
          finalResponse.includes("<HTML_SCRIPT>") ||
          finalResponse.includes("<IMAGE_GENERATION>") ||
          finalResponse.includes("<GOOGLE_SEARCH>");

        // Keep the message in the optimistic state array but mark it differently
        // For tool responses, we keep isOptimistic true to prevent premature cleanup
        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                response: finalResponse,
                streamingResponse: undefined,
                // For tool responses, keep isOptimistic true to prevent cleanup
                // during tool processing
                isOptimistic: hasTool,
              }
            : msg
        );
      });

      // Only trigger refetch for non-tool responses
      // Tools will handle their own refetch after processing completes
      const hasTool =
        finalResponse.includes("<OPENSCAD>") ||
        finalResponse.includes("<HTML_SCRIPT>") ||
        finalResponse.includes("<IMAGE_GENERATION>") ||
        finalResponse.includes("<GOOGLE_SEARCH>");

      if (!hasTool) {
        // For regular responses without tools, trigger refetch and cleanup
        setTimeout(() => {
          console.log(
            `🔄 [OptimisticUpdate] Triggering delayed refetch after finalizing: ${pairId}`
          );
          refetch();

          // Only remove after refetch for non-tool responses
          setTimeout(() => {
            console.log(
              `🧹 [Cleanup] Removing optimistic message after refetch: ${pairId}`
            );
            setOptimisticMessages((prev) =>
              prev.filter((msg) => msg.id !== pairId)
            );
          }, 1000); // Wait 1 second after refetch to ensure data is loaded
        }, 800);
      }
    },
    [refetch]
  );

  // Clear all optimistic messages
  const clearOptimisticMessages = useCallback(() => {
    setOptimisticMessages([]);
  }, []);

  const value = {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
    refetch,
    addOptimisticMessage,
    updateOptimisticResponse,
    finalizeOptimisticMessage,
    clearOptimisticMessages,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationHistory() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversationHistory must be used within a ConversationProvider"
    );
  }
  return context;
}
