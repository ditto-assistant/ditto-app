import { MdClose, MdBugReport, MdLightbulb } from "react-icons/md";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { useState, useEffect } from "react";
import { BASE_URL } from "../firebaseConfig";
import { getDeviceID, APP_VERSION } from "../utils/deviceId";
import { useAuth, useAuthToken } from "../hooks/useAuth";
import { FaGithub } from "react-icons/fa";
import { LoadingSpinner } from "./LoadingSpinner";
import { toast } from "react-hot-toast";

interface FeedbackModalProps {
  onClose: () => void;
  feedbackType?: "bug" | "feature-request";
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
  feedbackType,
}: FeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<"bug" | "feature-request">(
    feedbackType || "bug"
  );
  const auth = useAuth();
  const token = useAuthToken();
  const [state, formAction] = useActionState(submitFeedback, null);

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
        <div className="modal-header">
          <h3>Feedback</h3>
          <MdClose
            className="close-icon"
            onClick={onClose}
            style={{ cursor: "pointer" }}
          />
        </div>

        <form action={formAction} className="modal-body">
          <input type="hidden" name="userID" value={auth.user?.uid || ""} />
          <input type="hidden" name="deviceID" value={getDeviceID()} />
          <input type="hidden" name="version" value={APP_VERSION} />
          <input
            type="hidden"
            name="authorization"
            value={`Bearer ${token.data}`}
          />

          {!feedbackType && (
            <div className="feedback-type-selector">
              <div className="feedback-buttons">
                <button
                  type="button"
                  onClick={() => setSelectedType("bug")}
                  className={`feedback-button feedback-bug-button ${
                    selectedType === "bug" ? "selected" : ""
                  }`}
                >
                  <MdBugReport className="feedback-icon bug-icon" />
                  Bug
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("feature-request")}
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
          )}

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

          <div className="feedback-actions">
            <a
              href="https://github.com/orgs/ditto-assistant/discussions/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
            >
              <FaGithub /> Open a Discussion
            </a>
            <a
              href="https://github.com/ditto-assistant/ditto-app/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
            >
              <FaGithub /> Create an Issue
            </a>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`submit-button ${pending ? "loading" : ""}`}
      disabled={pending}
    >
      <span className="button-text">
        {pending ? "Submitting..." : "Submit"}
      </span>
      {pending && (
        <span className="button-spinner">
          <LoadingSpinner />
        </span>
      )}
    </button>
  );
}
