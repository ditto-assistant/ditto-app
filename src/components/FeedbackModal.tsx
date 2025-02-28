import { MdBugReport, MdLightbulb } from "react-icons/md";
import { useActionState, useCallback, useEffect } from "react";
import { useState, useRef } from "react";
import { BASE_URL } from "@/firebaseConfig";
import { getDeviceID, APP_VERSION } from "@/utils/deviceId";
import { useAuth, useAuthToken } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "react-hot-toast";
import { SubmitButton } from "@/components/ui/buttons/SubmitButton";
import SocialLinks from "@/components/ui/links/SocialLinks";
import "./FeedbackModal.css";
import { useModal } from "@/hooks/useModal";
import Modal from "@/components/ui/modals/Modal";
import { Result } from "@/types/common";
import { usePlatform } from "@/hooks/usePlatform";

type FeedbackType = "bug" | "feature-request";
interface FeedbackModalProps {
  feedbackType?: FeedbackType;
}

type FeedbackState = Result<boolean>;

async function submitFeedback(_: FeedbackState, formData: FormData) {
  try {
    const response = await fetch(`${BASE_URL}/v1/feedback`, {
      method: "POST",
      body: formData,
    });
    if (response.status === 201) {
      return { ok: true };
    }
    const error = await response.text();
    return { err: error };
  } catch (error: unknown) {
    return { err: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default function FeedbackModal({
  feedbackType = "bug",
}: FeedbackModalProps) {
  const { isMobile } = usePlatform();
  const { createCloseHandler } = useModal();
  const [selectedType, setSelectedType] = useState(feedbackType);
  const createSelectTypeCallback = useCallback(
    (type: FeedbackType) => () => setSelectedType(type),
    []
  );
  const auth = useAuth();
  const token = useAuthToken();
  const [state, formAction] = useActionState(submitFeedback, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  const closeModal = createCloseHandler("feedback");
  useEffect(() => {
    if (state?.err) {
      toast.error(state.err);
    }
    if (state?.ok) {
      toast.success("Feedback submitted successfully!");
      formRef.current?.reset();
      state.ok = false;
      closeModal();
    }
  }, [state, closeModal]);
  if (auth.isLoading || token.isLoading) {
    return <LoadingSpinner />;
  }
  if (auth.error || token.error) {
    return <div className="error-message">Authentication required</div>;
  }

  return (
    <Modal id="feedback" title="Feedback" fullScreen={isMobile}>
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="userID" value={auth.user?.uid || ""} />
        <input type="hidden" name="deviceID" value={getDeviceID()} />
        <input type="hidden" name="version" value={APP_VERSION} />
        <input
          type="hidden"
          name="authorization"
          value={`Bearer ${token.data}`}
        />

        <div className="feedback-type-selector">
          <div className="feedback-buttons">
            <button
              type="button"
              onClick={createSelectTypeCallback("bug")}
              className={`modal-feedback-button feedback-bug-button ${
                selectedType === "bug" ? "selected" : ""
              }`}
            >
              <MdBugReport className="feedback-icon bug-icon" />
              Bug
            </button>
            <button
              type="button"
              onClick={createSelectTypeCallback("feature-request")}
              className={`modal-feedback-button feedback-feature-button ${
                selectedType === "feature-request" ? "selected" : ""
              }`}
            >
              <MdLightbulb className="feedback-icon feature-icon" />
              Idea
            </button>
          </div>
          <input type="hidden" name="type" value={selectedType} />
        </div>

        <div className="feedback-form">
          <textarea
            id="feedback"
            name="feedback"
            className="feedback-textarea"
            placeholder="Write your feedback here..."
            required
            rows={6}
          />
        </div>
        <SubmitButton />
        <SocialLinks />
      </form>
    </Modal>
  );
}
