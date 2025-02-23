import {
  createContext,
  useCallback,
  useContext,
  ReactNode,
  useReducer,
  Fragment,
} from "react";

export type ModalId = "feedback" | "memoryNetwork";

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
  content: ReactNode;
}

type ModalAction =
  | {
      type: "OPEN_MODAL";
      id: ModalId;
      content: ReactNode;
    }
  | { type: "CLOSE_MODAL"; id: ModalId }
  | { type: "CLOSE_ALL" };

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case "OPEN_MODAL":
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.id]: {
            isOpen: true,
            content: action.content,
          },
        },
      };

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

    default:
      return state;
  }
};

interface ModalContextType {
  createOpenHandler: (id: ModalId) => () => void;
  createCloseHandler: (id: ModalId) => () => void;
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

  const closeAllModals = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);

  const getModalState = useCallback(
    (id: ModalId) => state.modals[id],
    [state.modals]
  );

  return (
    <ModalContext.Provider
      value={{
        createOpenHandler,
        createCloseHandler,
        closeAllModals,
        getModalState,
      }}
    >
      <>
        {children}
        {Object.entries(state.modals).map(([id, modal]) => (
          <Fragment key={id}>{modal.content}</Fragment>
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
};
