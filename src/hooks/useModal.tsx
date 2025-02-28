import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  createContext,
  useCallback,
  useContext,
  ReactNode,
  useReducer,
  Fragment,
  Suspense,
} from "react";

export type ModalId =
  | "feedback"
  | "memoryNetwork"
  | "imageViewer"
  | "settings"
  | "scripts"
  | "dittoCanvas"
  | "confirmationDialog"
  | "memorySettings"
  | "memoryNodeViewer";

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

    case "CLOSE_ALL":
      const closedModals = Object.fromEntries(
        Object.entries(state.modals).map(([id, modal]) => [
          id,
          { ...modal, isOpen: false },
        ])
      );
      return { ...state, modals: closedModals };

    case "BRING_TO_FRONT": {
      const currentModal = state.modals[action.id];
      if (!currentModal) return state;

      const currentZIndex = currentModal.zIndex || 0;
      const maxZIndex = Math.max(
        currentZIndex,
        ...Object.values(state.modals)
          .filter((modal) => modal !== currentModal)
          .map((modal) => modal.zIndex || 0)
      );

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

  const createOpenHandler = useCallback(
    (id: ModalId) => {
      const registration = registry[id];
      if (!registration) {
        console.error(`No modal registered for id: ${id}`);
        return () => {};
      }
      return () => {
        dispatch({
          type: "OPEN_MODAL",
          id,
          content: registration.component,
        });
      };
    },
    [registry]
  );

  const createCloseHandler = useCallback(
    (id: ModalId) => () => dispatch({ type: "CLOSE_MODAL", id }),
    []
  );

  const createBringToFrontHandler = useCallback(
    (id: ModalId) => {
      // Create a debounced version that only fires once per 100ms
      let lastCallTime = 0;
      const DEBOUNCE_TIME = 100; // milliseconds

      return () => {
        const now = Date.now();
        if (now - lastCallTime < DEBOUNCE_TIME) {
          return; // Skip if called too soon after last call
        }
        lastCallTime = now;

        // Check if modal is already at the front before dispatching
        const modal = state.modals[id];
        if (!modal) return;

        const currentZIndex = modal.zIndex || 0;
        const maxZIndex = Math.max(
          ...Object.values(state.modals)
            .filter((m) => m !== modal)
            .map((m) => m.zIndex || 0)
        );

        // Only dispatch if we need to change the z-index
        if (currentZIndex < maxZIndex) {
          dispatch({ type: "BRING_TO_FRONT", id });
        }
      };
    },
    [state.modals]
  );

  const closeAllModals = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);

  const getModalState = useCallback(
    (id: ModalId) => state.modals[id],
    [state.modals]
  );

  return (
    <ModalContext.Provider
      value={{
        createBringToFrontHandler,
        createOpenHandler,
        createCloseHandler,
        closeAllModals,
        getModalState,
      }}
    >
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
