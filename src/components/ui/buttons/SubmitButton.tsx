import React, { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { ModalButton } from "./ModalButton";
import { useIsMobile } from "../../../hooks/useIsMobile";
import "./SubmitButton.css";

interface SubmitButtonProps extends React.ComponentProps<typeof ModalButton> {
  submittingText?: string;
  submitText?: string;
  enableKeyboardShortcut?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  submittingText = "Submitting...",
  submitText = "Submit",
  shortcutHint = "⌘↵",
  variant = "primary",
  className = "",
  ...props
}) => {
  const { pending } = useFormStatus();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const form = (e.target as HTMLElement).closest("form");
        form?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ModalButton
      type="submit"
      variant={variant}
      isLoading={pending}
      disabled={pending}
      shortcutHint={shortcutHint}
      hideShortcut={isMobile}
      className={`submit-button ${className}`}
      {...props}
    >
      {pending ? submittingText : submitText}
    </ModalButton>
  );
};
