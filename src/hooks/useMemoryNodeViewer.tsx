import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from "react"
import { useModal } from "./useModal"
import { Memory } from "@/api/getMemories"

interface MemoryNodeViewerContextType {
  nodeData: Memory | null
  setNodeData: (data: Memory | null) => void
  onDelete?: (node: Memory) => void
  setOnDelete: (callback: ((node: Memory) => void) | undefined) => void
}

const MemoryNodeViewerContext = createContext<
  MemoryNodeViewerContextType | undefined
>(undefined)

export function MemoryNodeViewerProvider({
  children,
}: {
  children: ReactNode
}) {
  const [nodeData, setNodeData] = useState<Memory | null>(null)
  const [onDelete, setOnDelete] = useState<
    ((node: Memory) => void) | undefined
  >(undefined)

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
  )
}

export function useMemoryNodeViewer() {
  const context = useContext(MemoryNodeViewerContext)

  if (context === undefined) {
    throw new Error(
      "useMemoryNodeViewer must be used within a MemoryNodeViewerProvider"
    )
  }

  const { createOpenHandler, createCloseHandler } = useModal()
  const openModal = createOpenHandler("memoryNodeViewer")
  const closeModal = createCloseHandler("memoryNodeViewer")

  // Add a ref to track if a modal is already open to prevent duplicate operations
  const isModalOpenRef = useRef(false)

  const showMemoryNode = useCallback(
    (node: Memory, deleteCallback?: (node: Memory) => void) => {
      // Only update if we're not already showing this node
      if (isModalOpenRef.current && context.nodeData?.id === node.id) {
        return // Don't reopen the same node
      }

      isModalOpenRef.current = true
      context.setNodeData(node)
      if (deleteCallback) {
        context.setOnDelete(() => deleteCallback)
      }
      openModal()
    },
    [context, openModal]
  )

  const hideMemoryNode = useCallback(() => {
    // First close the modal
    closeModal()
    isModalOpenRef.current = false

    // We no longer need to clear the data as quickly,
    // which avoids some race conditions when re-rendering the network
    setTimeout(() => {
      context.setNodeData(null)
      context.setOnDelete(undefined)
    }, 800) // Increased timeout to ensure animation completes
  }, [context, closeModal])

  return {
    ...context,
    showMemoryNode,
    hideMemoryNode,
  }
}
