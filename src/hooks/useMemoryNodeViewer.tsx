import { ReactNode, createContext, useContext, useState } from "react";
import { useModal } from "./useModal";

interface MemoryNodeData {
  id: string;
  prompt: string;
  response: string;
  level: number;
  timestamp?: number;
  nodeId?: string;
  [key: string]: any; // For any additional properties
}

interface MemoryNodeViewerContextType {
  nodeData: MemoryNodeData | null;
  setNodeData: (data: MemoryNodeData | null) => void;
  onDelete?: (node: MemoryNodeData) => void;
  setOnDelete: (callback: ((node: MemoryNodeData) => void) | undefined) => void;
}

const MemoryNodeViewerContext = createContext<
  MemoryNodeViewerContextType | undefined
>(undefined);

export function MemoryNodeViewerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [nodeData, setNodeData] = useState<MemoryNodeData | null>(null);
  const [onDelete, setOnDelete] = useState<
    ((node: MemoryNodeData) => void) | undefined
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

  const showMemoryNode = (
    node: MemoryNodeData,
    deleteCallback?: (node: MemoryNodeData) => void
  ) => {
    context.setNodeData(node);
    if (deleteCallback) {
      context.setOnDelete(() => deleteCallback);
    }
    openModal();
  };

  const hideMemoryNode = () => {
    closeModal();
    // Small delay to ensure the modal is closed before clearing data
    setTimeout(() => {
      context.setNodeData(null);
      context.setOnDelete(undefined);
    }, 200);
  };

  return {
    ...context,
    showMemoryNode,
    hideMemoryNode,
  };
}
