import { useState } from 'react';
import { MdBugReport, MdLightbulb } from 'react-icons/md';
import { useAuth, useAuthToken } from '../hooks/useAuth';
import { getDeviceID, APP_VERSION } from '../utils/deviceId';
import { BASE_URL } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from './LoadingSpinner';
import { ModalHeader } from './ui/modals/ModalHeader';
import './FeedbackModal.css';
import { FaGithub, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { useCallback } from "react";
import { useEffect, useRef } from "react";
import { SubmitButton } from "./ui/buttons/SubmitButton";
import { A } from "./ui/links/Anchor";

type FeedbackType = 'bug' | 'feature-request';

interface FeedbackModalProps {
  onClose: () => void;
  feedbackType?: FeedbackType;
}

export default function FeedbackModal({
  onClose,
  feedbackType = 'bug',
}: FeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType>(feedbackType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = useAuth();
  const token = useAuthToken();
  const createSelectTypeCallback = useCallback(
    (type: FeedbackType) => () => setSelectedType(type),
    []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth.user?.uid || !token.data) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch(`${BASE_URL}/v1/feedback`, {
        method: 'POST',
        body: formData,
      });

      if (response.status === 201) {
        toast.success('Feedback submitted successfully!');
        onClose();
      } else {
        const error = await response.text();
        toast.error(error || 'Failed to submit feedback');
      }
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (auth.isLoading || token.isLoading) {
    return <LoadingSpinner />;
  }

  if (auth.error || token.error) {
    return <div className="error-message">Authentication required</div>;
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <ModalHeader title="Feedback" onClose={onClose} />
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="userID" value={auth.user?.uid || ''} />
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
                  onClick={createSelectTypeCallback('bug')}
                  className={`feedback-button feedback-bug-button ${
                    selectedType === 'bug' ? 'selected' : ''
                  }`}
                >
                  <MdBugReport className="feedback-icon bug-icon" />
                  Bug
                </button>
                <button
                  type="button"
                  onClick={createSelectTypeCallback('feature-request')}
                  className={`feedback-button feedback-feature-button ${
                    selectedType === 'feature-request' ? 'selected' : ''
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

            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>

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
