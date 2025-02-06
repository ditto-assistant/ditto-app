import { MdClose } from "react-icons/md";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { BASE_URL } from "../firebaseConfig";
import { getDeviceID, APP_VERSION } from "../utils/deviceId";
import { useAuth, useAuthToken } from "../hooks/useAuth";
import { FaGithub } from "react-icons/fa";
import { LoadingSpinner } from "./LoadingSpinner";

interface FeedbackModalProps {
  onClose: () => void;
  feedbackType?: "bug" | "feature-request";
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

  if (auth.isLoading || token.isLoading) {
    return <LoadingSpinner />;
  }
  if (auth.error || token.error) {
    return <div className="error-message">Authentication required</div>;
  }

  const redirectURL = window.location.origin + "/feedback/result";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>Submit Feedback</h3>
          <MdClose
            className="close-icon"
            onClick={onClose}
            style={{ cursor: "pointer" }}
          />
        </div>

        <form
          action={`${BASE_URL}/v1/feedback`}
          method="POST"
          className="modal-body"
        >
          <input type="hidden" name="userID" value={auth.user?.uid || ""} />
          <input type="hidden" name="deviceID" value={getDeviceID()} />
          <input type="hidden" name="version" value={APP_VERSION} />
          <input
            type="hidden"
            name="authorization"
            value={`Bearer ${token.data}`}
          />
          <input type="hidden" name="redirect" value={redirectURL} />

          {!feedbackType && (
            <div className="feedback-type-selector">
              <label className="filter-label">Feedback Type</label>
              <div className="filter-buttons">
                <button
                  type="button"
                  onClick={() => setSelectedType("bug")}
                  className={`filter-button ${
                    selectedType === "bug" ? "active-filter" : ""
                  }`}
                >
                  Bug Report
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("feature-request")}
                  className={`filter-button ${
                    selectedType === "feature-request" ? "active-filter" : ""
                  }`}
                >
                  Feature Request
                </button>
              </div>
              <input type="hidden" name="type" value={selectedType} />
            </div>
          )}

          <div className="feedback-form">
            <label className="filter-label" htmlFor="feedback">
              Your Feedback
            </label>
            <textarea
              id="feedback"
              name="feedback"
              className="feedback-textarea"
              placeholder="Please describe your feedback in detail..."
              required
              rows={6}
            />
          </div>

          <div className="feedback-actions">
            <a
              href="https://github.com/orgs/ditto-assistant/discussions/new"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
            >
              <FaGithub /> Open a GitHub Discussion
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
    <button type="submit" className="submit-button" disabled={pending}>
      {pending ? "Submitting..." : "Submit Feedback"}
    </button>
  );
}
