import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";

interface ModalContextType {
  currentModal: string | null;
  openModal: (modalName: string) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [currentModal, setCurrentModal] = useState<string | null>(null);
  const openModal = useCallback(
    (modalName: string) => setCurrentModal(modalName),
    []
  );
  const closeModal = useCallback(() => setCurrentModal(null), []);

  return (
    <ModalContext.Provider value={{ currentModal, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
