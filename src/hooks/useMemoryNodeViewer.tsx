import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useModal } from "./useModal";
import { Memory } from "@/api/getMemories";

// Just add level field for nodes that may not have it
interface MemoryWithLevel extends Memory {
  level?: number;
  nodeId?: string;
}

interface MemoryNodeViewerContextType {
  nodeData: MemoryWithLevel | null;
  setNodeData: (data: MemoryWithLevel | null) => void;
  onDelete?: (node: MemoryWithLevel) => void;
  setOnDelete: (
    callback: ((node: MemoryWithLevel) => void) | undefined
  ) => void;
}

const MemoryNodeViewerContext = createContext<
  MemoryNodeViewerContextType | undefined
>(undefined);

export function MemoryNodeViewerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [nodeData, setNodeData] = useState<MemoryWithLevel | null>(null);
  const [onDelete, setOnDelete] = useState<
    ((node: MemoryWithLevel) => void) | undefined
  >(undefined);

  return (
    <MemoryNodeViewerContext.Provider
      value={{
        nodeData,
        setNodeData,
        onDelete,
        setOnDelete,
      }}
    >
      {children}
    </MemoryNodeViewerContext.Provider>
  );
}

export function useMemoryNodeViewer() {
  const context = useContext(MemoryNodeViewerContext);

  if (context === undefined) {
    throw new Error(
      "useMemoryNodeViewer must be used within a MemoryNodeViewerProvider"
    );
  }

  const { createOpenHandler, createCloseHandler } = useModal();
  const openModal = createOpenHandler("memoryNodeViewer");
  const closeModal = createCloseHandler("memoryNodeViewer");

  const showMemoryNode = useCallback(
    (
      node: MemoryWithLevel,
      deleteCallback?: (node: MemoryWithLevel) => void
    ) => {
      context.setNodeData(node);
      if (deleteCallback) {
        context.setOnDelete(() => deleteCallback);
      }
      openModal();
    },
    [context, openModal]
  );

  const hideMemoryNode = useCallback(() => {
    // First close the modal
    closeModal();

    // We no longer need to clear the data as quickly,
    // which avoids some race conditions when re-rendering the network
    setTimeout(() => {
      context.setNodeData(null);
      context.setOnDelete(undefined);
    }, 500);
  }, [context, closeModal]);

  return {
    ...context,
    showMemoryNode,
    hideMemoryNode,
  };
}
