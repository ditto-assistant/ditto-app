import { ReactNode, createContext, useContext, useState } from "react";
import { useModal } from "./useModal";
import { getMemories, Memory as ApiMemory } from "@/api/getMemories";
import { useModelPreferences } from "./useModelPreferences";
import { auth } from "@/control/firebase";
import { toast } from "react-hot-toast";

// Define our own Memory interface that matches what we need for the UI
export interface Memory {
  id: string;
  prompt: string;
  response: string;
  timestamp: number;
  timestampString?: string;
  children?: Memory[];
}

// Helper function to convert API Memory to our Memory format
const convertApiMemoryToMemory = (apiMemory: ApiMemory): Memory => {
  return {
    id: apiMemory.id,
    prompt: apiMemory.prompt || "No prompt available",
    response: apiMemory.response || "No response available",
    timestamp: apiMemory.timestamp
      ? new Date(apiMemory.timestamp).getTime()
      : Date.now(),
    timestampString: apiMemory.timestamp
      ? new Date(apiMemory.timestamp).toISOString()
      : new Date().toISOString(),
    children: Array.isArray(apiMemory.children)
      ? apiMemory.children.map((child) =>
          convertApiMemoryToMemory(child || ({} as ApiMemory))
        )
      : [],
  };
};

// Recursively filter out a memory by ID from a memories array
const filterMemoryById = (memories: Memory[], idToRemove: string): Memory[] => {
  return memories
    .filter((memory) => memory.id !== idToRemove)
    .map((memory) => {
      if (memory.children && memory.children.length > 0) {
        return {
          ...memory,
          children: filterMemoryById(memory.children, idToRemove),
        };
      }
      return memory;
    });
};

interface MemoryNetworkContextType {
  memories: Memory[];
  setMemories: (memories: Memory[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  fetchMemories: (
    message: any,
    index: number,
    messages?: any[]
  ) => Promise<void>;
  deleteMemory: (memoryId: string) => void;
}

const MemoryNetworkContext = createContext<
  MemoryNetworkContextType | undefined
>(undefined);

export function MemoryNetworkProvider({ children }: { children: ReactNode }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const { preferences } = useModelPreferences();

  return (
    <MemoryNetworkContext.Provider
      value={{
        memories,
        setMemories,
        loading,
        setLoading,
        deleteMemory: (memoryId: string) => {
          setMemories((prevMemories) =>
            filterMemoryById(prevMemories, memoryId)
          );
        },
        fetchMemories: async (message, index, messages) => {
          try {
            setLoading(true);

            const userID = auth.currentUser?.uid;
            if (!userID) {
              throw new Error("User not authenticated");
            }

            if (!preferences) {
              throw new Error("Model preferences not available");
            }

            let promptToUse: string;
            let currentPairID: string;
            let currentTimestamp: number;

            if (message.sender === "User") {
              promptToUse = message.text;
              currentPairID = message.pairID;
              currentTimestamp = message.timestamp;
            } else {
              // If this is a Ditto message, find the corresponding user message
              const messagesList = messages || [];
              if (index > 0 && messagesList[index - 1]?.sender === "User") {
                promptToUse = messagesList[index - 1].text;
                currentPairID = messagesList[index - 1].pairID;
                currentTimestamp = messagesList[index - 1].timestamp;
              } else {
                console.error(
                  "Could not find corresponding prompt for response"
                );
                setLoading(false);
                return;
              }
            }

            const memoriesResponse = await getMemories(
              {
                userID,
                longTerm: {
                  pairID: currentPairID,
                  nodeCounts: preferences.memory.longTermMemoryChain,
                },
                stripImages: false,
              },
              "application/json"
            );

            if (memoriesResponse.err) {
              throw new Error(memoriesResponse.err);
            }

            if (!memoriesResponse.ok || !memoriesResponse.ok.longTerm) {
              throw new Error("Failed to fetch memories");
            }

            // Convert API memories to our format
            const convertedMemories = memoriesResponse.ok.longTerm.map(
              convertApiMemoryToMemory
            );

            // Log the original IDs and converted IDs for debugging
            console.log("Original API memories:", memoriesResponse.ok.longTerm);
            console.log("Converted memories:", convertedMemories);

            // The root node uses the currentPairID which should always be available
            const rootId = currentPairID;

            // Create the network data structure
            const networkData = [
              {
                id: rootId,
                prompt: promptToUse || "Your query",
                response: message.text || "Response",
                timestamp: currentTimestamp || Date.now(),
                timestampString: currentTimestamp
                  ? new Date(currentTimestamp).toISOString()
                  : new Date().toISOString(),
                children: Array.isArray(convertedMemories)
                  ? convertedMemories
                  : [],
              },
            ];

            console.log(
              "Memory Network Data with IDs:",
              networkData.map((node) => ({
                id: node.id,
                childCount: node.children?.length || 0,
                children: node.children?.map((child) => ({
                  id: child.id,
                  childCount: child.children?.length || 0,
                })),
              }))
            );

            setMemories(networkData);
          } catch (error) {
            console.error("Error fetching memories:", error);
            toast.error("Failed to load memory network");
          } finally {
            setLoading(false);
          }
        },
      }}
    >
      {children}
    </MemoryNetworkContext.Provider>
  );
}

export function useMemoryNetwork() {
  const context = useContext(MemoryNetworkContext);
  if (context === undefined) {
    throw new Error(
      "useMemoryNetwork must be used within a MemoryNetworkProvider"
    );
  }
  const { createOpenHandler, createCloseHandler } = useModal();
  const openModal = createOpenHandler("memoryNetwork");
  const closeModal = createCloseHandler("memoryNetwork");
  const showMemoryNetwork = async (
    message: any,
    index: number,
    messages?: any[]
  ) => {
    try {
      await context.fetchMemories(message, index, messages);
      openModal();
    } catch (error) {
      console.error("Error showing memory network:", error);
      toast.error("Failed to show memory network");
    }
  };

  return {
    ...context,
    showMemoryNetwork,
    closeMemoryNetwork: closeModal,
  };
}
