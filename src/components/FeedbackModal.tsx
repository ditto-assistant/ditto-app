import { MdBugReport, MdLightbulb } from "react-icons/md";
import { useActionState, useCallback } from "react";
import { useState, useEffect, useRef } from "react";
import { BASE_URL } from "../firebaseConfig";
import { getDeviceID, APP_VERSION } from "../utils/deviceId";
import { useAuth, useAuthToken } from "../hooks/useAuth";
import { FaGithub, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { LoadingSpinner } from "./LoadingSpinner";
import { toast } from "react-hot-toast";
import { SubmitButton } from "./ui/buttons/SubmitButton";
import { A } from "./ui/links/Anchor";
import { ModalHeader } from "./ui/modals/ModalHeader";

type FeedbackType = "bug" | "feature-request";
interface FeedbackModalProps {
  onClose: () => void;
  feedbackType?: FeedbackType;
}

async function submitFeedback(prevState: any, formData: FormData) {
  try {
    const response = await fetch(`${BASE_URL}/v1/feedback`, {
      method: "POST",
      body: formData,
    });

    if (response.status === 201) {
      toast.success("Feedback submitted successfully!");
      return { success: true };
    }
    const error = await response.text();
    toast.error(error || "Failed to submit feedback");
    return { success: false, error };
  } catch (error) {
    toast.error("Failed to submit feedback");
    return { success: false, error: "Failed to submit feedback" };
  }
}

export default function FeedbackModal({
  onClose,
  feedbackType = "bug",
}: FeedbackModalProps) {
  const [selectedType, setSelectedType] = useState(feedbackType);
  const createSelectTypeCallback = useCallback(
    (type: FeedbackType) => () => setSelectedType(type),
    []
  );
  const auth = useAuth();
  const token = useAuthToken();
  const [state, formAction] = useActionState(submitFeedback, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  if (auth.isLoading || token.isLoading) {
    return <LoadingSpinner />;
  }
  if (auth.error || token.error) {
    return <div className="error-message">Authentication required</div>;
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <ModalHeader title="Feedback" onClose={onClose} />
        <div className="modal-body">
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
                  className={`feedback-button feedback-bug-button ${
                    selectedType === "bug" ? "selected" : ""
                  }`}
                >
                  <MdBugReport className="feedback-icon bug-icon" />
                  Bug
                </button>
                <button
                  type="button"
                  onClick={createSelectTypeCallback("feature-request")}
                  className={`feedback-button feedback-feature-button ${
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

            <div className="feedback-actions">
              <A href="https://github.com/orgs/ditto-assistant/discussions/new/choose">
                <FaGithub /> New Discussion
              </A>
              <A href="https://github.com/ditto-assistant/ditto-app/issues/new">
                <FaGithub /> New Issue
              </A>
              <A href="https://www.instagram.com/heyditto.ai">
                <FaInstagram /> Instagram
              </A>
              <A href="https://x.com/heydittoai">
                <FaXTwitter /> Twitter
              </A>
              <A href="https://www.youtube.com/@heyditto">
                <FaYoutube /> YouTube
              </A>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
