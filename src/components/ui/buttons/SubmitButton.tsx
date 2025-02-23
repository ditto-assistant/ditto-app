import React, { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { ModalButton } from "./ModalButton";
import { useIsMobile } from "../../../hooks/useIsMobile";
import "./SubmitButton.css";

interface SubmitButtonProps
  extends Omit<React.ComponentProps<typeof ModalButton>, "children"> {
  submittingText?: string;
  submitText?: string;
  enableKeyboardShortcut?: boolean;
  onSubmit?: () => void;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  submittingText = "Submitting...",
  submitText = "Submit",
  variant = "primary",
  className = "",
  enableKeyboardShortcut = true,
  onSubmit,
  ...props
}) => {
  const { pending } = useFormStatus();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile || !enableKeyboardShortcut) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const form = (e.target as HTMLElement).closest("form");
        form?.requestSubmit();
        onSubmit?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardShortcut, isMobile, onSubmit]);

  return (
    <ModalButton
      type="submit"
      variant={variant}
      isLoading={pending}
      disabled={pending}
      className={`submit-button ${className}`}
      {...props}
    >
      {pending ? submittingText : submitText}
      {!isMobile && enableKeyboardShortcut && (
        <span className="shortcut-hint">⌘↵</span>
      )}
    </ModalButton>
  );
};
