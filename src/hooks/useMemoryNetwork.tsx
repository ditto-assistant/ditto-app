import { ReactNode, createContext, useContext, useState } from "react";
import { useModal } from "./useModal";
import { getMemories, Memory } from "@/api/getMemories";
import { useModelPreferences } from "./useModelPreferences";
import { auth } from "@/control/firebase";
import { toast } from "react-hot-toast";

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
  fetchMemories: (memory: Memory) => Promise<void>;
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
            filterMemoryById(prevMemories, memoryId),
          );
        },
        fetchMemories: async (memory) => {
          try {
            setLoading(true);

            const userID = auth.currentUser?.uid;
            if (!userID) {
              throw new Error("User not authenticated");
            }
            if (!preferences) {
              throw new Error("Model preferences not available");
            }
            const memoriesResponse = await getMemories(
              {
                userID,
                longTerm: {
                  pairID: memory.id,
                  nodeCounts: preferences.memory.longTermMemoryChain,
                },
                stripImages: false,
              },
              "application/json",
            );

            if (memoriesResponse.err) {
              throw new Error(memoriesResponse.err);
            }

            if (!memoriesResponse.ok || !memoriesResponse.ok.longTerm) {
              throw new Error("Failed to fetch memories");
            }

            // Use memories directly without conversion
            const fetchedMemories = memoriesResponse.ok.longTerm;

            // Log memories for debugging
            console.log("Fetched memories:", fetchedMemories);

            // The root node uses the currentPairID which should always be available
            const rootId = memory.id;

            // Create the network data structure
            const networkData = [
              {
                ...memory,
                children: Array.isArray(fetchedMemories) ? fetchedMemories : [],
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
              })),
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
      "useMemoryNetwork must be used within a MemoryNetworkProvider",
    );
  }
  const { createOpenHandler, createCloseHandler } = useModal();
  const openModal = createOpenHandler("memoryNetwork");
  const closeModal = createCloseHandler("memoryNetwork");
  const showMemoryNetwork = async (message: Memory) => {
    try {
      await context.fetchMemories(message);
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
