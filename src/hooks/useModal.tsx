import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner";
import {
  createContext,
  useCallback,
  useContext,
  ReactNode,
  useReducer,
  Fragment,
  Suspense,
  useMemo,
  useRef,
} from "react";

export type ModalId =
  | "feedback"
  | "memoryNetwork"
  | "imageViewer"
  | "settings"
  | "scripts"
  | "dittoCanvas"
  | "confirmationDialog"
  | "memoryNodeViewer"
  | "fullscreenCompose"
  | "whatsNew";

type ModalRegistration = {
  component: ReactNode;
};

export type ModalRegistry = Partial<Record<ModalId, ModalRegistration>>;

interface ModalState {
  modals: {
    [key in ModalId]?: SingleModalState;
  };
}

export interface SingleModalState {
  isOpen: boolean;
  zIndex: number;
  content: ReactNode;
}

type ModalAction =
  | {
      type: "OPEN_MODAL";
      id: ModalId;
      content: ReactNode;
    }
  | { type: "CLOSE_MODAL"; id: ModalId }
  | { type: "CLOSE_ALL" }
  | { type: "BRING_TO_FRONT"; id: ModalId };

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case "OPEN_MODAL": {
      // Calculate the highest z-index among all modals
      const maxZIndex = Object.values(state.modals)
        .map((modal) => modal?.zIndex || 0)
        .reduce((max, current) => Math.max(max, current), 0);

      return {
        ...state,
        modals: {
          ...state.modals,
          [action.id]: {
            isOpen: true,
            content: action.content,
            zIndex: maxZIndex + 1, // Set z-index higher than any existing modal
          },
        },
      };
    }

    case "CLOSE_MODAL":
      // If the modal doesn't exist or is already closed, avoid unnecessary state update
      if (!state.modals[action.id] || !state.modals[action.id]?.isOpen) {
        return state;
      }

      return {
        ...state,
        modals: {
          ...state.modals,
          [action.id]: {
            ...state.modals[action.id],
            isOpen: false,
          },
        },
      };

    case "CLOSE_ALL": {
      // Only update if there are open modals
      const hasOpenModals = Object.values(state.modals).some(
        (modal) => modal?.isOpen,
      );
      if (!hasOpenModals) return state;

      const closedModals = Object.fromEntries(
        Object.entries(state.modals).map(([id, modal]) => [
          id,
          { ...modal, isOpen: false },
        ]),
      );
      return { ...state, modals: closedModals };
    }

    case "BRING_TO_FRONT": {
      const currentModal = state.modals[action.id];
      if (!currentModal) return state;

      // Find the highest z-index from other modals
      const otherModals = Object.entries(state.modals)
        .filter(([id]) => id !== action.id)
        .map(([, modal]) => modal);

      const maxZIndex = otherModals.reduce(
        (max, modal) => Math.max(max, modal?.zIndex || 0),
        0,
      );

      // Only update if the modal's z-index isn't already higher than others
      const currentZIndex = currentModal.zIndex || 0;
      if (currentZIndex >= maxZIndex) return state;

      return {
        ...state,
        modals: {
          ...state.modals,
          [action.id]: {
            ...currentModal,
            zIndex: maxZIndex + 1,
          },
        },
      };
    }

    default:
      return state;
  }
};

interface ModalContextType {
  createOpenHandler: (id: ModalId) => () => void;
  createCloseHandler: (id: ModalId) => () => void;
  createBringToFrontHandler: (id: ModalId) => () => void;
  closeAllModals: () => void;
  getModalState: (id: ModalId) => SingleModalState | undefined;
}

const ModalContext = createContext<ModalContextType | null>(null);

interface ModalProviderProps {
  children: ReactNode;
  registry: ModalRegistry;
}

export function ModalProvider({ children, registry }: ModalProviderProps) {
  const [state, dispatch] = useReducer(modalReducer, { modals: {} });

  // Store stable references to all modal handlers to avoid recreating them
  const stableHandlers = useRef(
    new Map<
      ModalId,
      {
        open: () => void;
        close: () => void;
        bringToFront: () => void;
      }
    >(),
  );

  // Function to get or create a stable handler for a modal
  const getOrCreateHandlers = useCallback(
    (id: ModalId) => {
      if (!stableHandlers.current.has(id)) {
        // Create stable handlers only once per modal ID
        stableHandlers.current.set(id, {
          open: () => {
            const registration = registry[id];
            if (!registration) {
              console.error(`No modal registered for id: ${id}`);
              return;
            }
            dispatch({
              type: "OPEN_MODAL",
              id,
              content: registration.component,
            });
          },
          close: () => dispatch({ type: "CLOSE_MODAL", id }),
          bringToFront: () => dispatch({ type: "BRING_TO_FRONT", id }),
        });
      }
      return stableHandlers.current.get(id)!;
    },
    [registry],
  );

  // Factory functions that return stable handler references
  const createOpenHandler = useCallback(
    (id: ModalId) => {
      return getOrCreateHandlers(id).open;
    },
    [getOrCreateHandlers],
  );

  const createCloseHandler = useCallback(
    (id: ModalId) => {
      return getOrCreateHandlers(id).close;
    },
    [getOrCreateHandlers],
  );

  const createBringToFrontHandler = useCallback(
    (id: ModalId) => {
      return getOrCreateHandlers(id).bringToFront;
    },
    [getOrCreateHandlers],
  );

  const closeAllModals = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);

  const getModalState = useCallback(
    (id: ModalId) => state.modals[id],
    [state.modals],
  );

  // Memoize the context value to prevent unnecessary rerenders
  const contextValue = useMemo(
    () => ({
      createOpenHandler,
      createCloseHandler,
      createBringToFrontHandler,
      closeAllModals,
      getModalState,
    }),
    [
      createOpenHandler,
      createCloseHandler,
      createBringToFrontHandler,
      closeAllModals,
      getModalState,
    ],
  );

  return (
    <ModalContext.Provider value={contextValue}>
      <>
        {children}
        {Object.entries(state.modals).map(([id, modal]) => (
          <Fragment key={id}>
            <Suspense fallback={<LoadingSpinner />}>{modal.content}</Suspense>
          </Fragment>
        ))}
      </>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

export const DEFAULT_MODAL_STATE: SingleModalState = {
  isOpen: false,
  content: null,
  zIndex: 1,
};
