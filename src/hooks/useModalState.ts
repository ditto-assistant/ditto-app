import { useState, useCallback } from "react";

interface UseModalStateProps {
  initialState?: boolean;
}

export const useModalState = ({
  initialState = false,
}: UseModalStateProps = {}) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};
