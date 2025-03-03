import "./SendMessage.css";
import { useState, useEffect, useRef } from "react";
import { FaPlus, FaImage, FaCamera, FaTimes } from "react-icons/fa";
import { sendPrompt } from "../control/agent";
import { auth, uploadImageToFirebaseStorageBucket } from "../control/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler";
import { useBalance } from "@/hooks/useBalance";
import { usePlatform } from "@/hooks/usePlatform";
import { useConversationHistory } from "@/hooks/useConversationHistory";
import { toast } from "react-hot-toast";
/**
 * A component that allows the user to send a message to the agent
 * @param {Object} props - The component props
 * @param {function(): void} props.onCameraOpen - A function that opens the camera
 * @param {string} props.capturedImage - The URL of the captured image
 * @param {function(): void} props.onClearCapturedImage - A function that clears the captured image
 * @param {boolean} props.showMediaOptions - Whether the media options are shown
 * @param {function(): void} props.onOpenMediaOptions - A function that opens the media options
 * @param {function(): void} props.onCloseMediaOptions - A function that closes the media options
 * @param {function(): void} props.onStop - A function that handles the stop event
 */
export default function SendMessage({
  onCameraOpen,
  capturedImage,
  onClearCapturedImage,
  showMediaOptions,
  onOpenMediaOptions,
  onCloseMediaOptions,
  onStop,
}) {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(capturedImage || "");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const textAreaRef = useRef(null);
  const preferences = useModelPreferences();
  const { openImageViewer } = useImageViewerHandler();
  const balance = useBalance();
  const { isMobile } = usePlatform();
  const { refetch } = useConversationHistory();

  const finalTranscriptRef = useRef("");
  const canvasRef = useRef();

  useEffect(() => {
    if (capturedImage) {
      setImage(capturedImage);
    }
  }, [capturedImage]);

  useEffect(() => {
    resizeTextArea();
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setImage("");
    onClearCapturedImage();
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();

    if (isWaitingForResponse) return;

    if (message === "" && !finalTranscriptRef.current && !image) return;

    setIsWaitingForResponse(true);

    try {
      const userID = auth.currentUser?.uid;

      if (!userID) {
        toast.error("Please log in to send a message");
        setIsWaitingForResponse(false);
        return;
      }
      if (!preferences.data) {
        toast.error("Please set your model preferences");
        setIsWaitingForResponse(false);
        return;
      }

      const firstName = localStorage.getItem("firstName") || "";
      let messageToSend = finalTranscriptRef.current || message;
      let imageURI = "";

      if (image) {
        try {
          imageURI = await uploadImageToFirebaseStorageBucket(image, userID);
          messageToSend = `![image](${imageURI})\n\n${messageToSend}`;
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast.error("Failed to upload image");
        }
      }

      setMessage("");
      setImage("");
      finalTranscriptRef.current = "";
      resizeTextArea();

      await sendPrompt(
        userID,
        firstName,
        messageToSend,
        imageURI,
        null,
        preferences.data,
        refetch,
        balance.hasPremium ?? false
      );
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsWaitingForResponse(false);
      onStop();
    }
  };

  const handleKeyDown = (e) => {
    if (isMobile) {
      if (e.key === "Enter") {
        e.preventDefault();
        setMessage((prevMessage) => prevMessage + "\n");
        resizeTextArea();
      }
    } else {
      if (e.key === "Enter") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setMessage((prevMessage) => prevMessage + "\n");
          resizeTextArea();
        } else if (!e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }
    }
  };

  const resizeTextArea = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      textArea.style.height = `${Math.min(textArea.scrollHeight, 200)}px`;

      if (textArea.scrollHeight >= 200) {
        textArea.style.overflowY = "auto";
      } else {
        textArea.style.overflowY = "hidden";
      }

      const imagePreview = document.querySelector(".ImagePreview");
      if (imagePreview) {
        imagePreview.style.bottom = `${textArea.offsetHeight + 10}px`;
      }
    }
  };

  useEffect(() => {
    const handleResize = () => resizeTextArea();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => resizeTextArea(), [message, image]);

  const handlePaste = (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result);
        };
        reader.readAsDataURL(blob);
        event.preventDefault();
        break;
      }
    }
  };

  const handlePlusClick = (e) => {
    e.stopPropagation();
    onOpenMediaOptions();
  };

  const handleGalleryClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("image-upload").click();
    onCloseMediaOptions();
  };

  const handleCameraClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCameraOpen();
    onCloseMediaOptions();
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="input-wrapper">
        <textarea
          ref={textAreaRef}
          onKeyDown={handleKeyDown}
          onInput={resizeTextArea}
          onPaste={handlePaste}
          className="text-area"
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (e.target.value.trim() === "") {
              finalTranscriptRef.current = "";
            }
          }}
          rows={3}
          style={{
            overflowY: "hidden",
            marginRight: "-5px",
          }}
        />
        <div className="icons-wrapper">
          <FaPlus className="plus-button" onClick={handlePlusClick} />
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </div>
      </div>
      <input
        className={`submit ${isWaitingForResponse ? "disabled" : ""}`}
        type="submit"
        value="Send"
        disabled={isWaitingForResponse}
      />

      {image && (
        <div className="image-preview" onClick={() => openImageViewer(image)}>
          <img src={image} alt="Preview" />
          <FaTimes
            className="remove-image"
            onClick={(e) => {
              e.stopPropagation();
              handleClearImage();
            }}
          />
        </div>
      )}

      <AnimatePresence>
        {showMediaOptions && (
          <motion.div
            className="media-options-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMediaOptions}
          >
            <motion.div
              className="media-options-content"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="media-option"
                onClick={handleGalleryClick}
              >
                <FaImage /> Photo Gallery
              </button>
              <button
                type="button"
                className="media-option"
                onClick={handleCameraClick}
              >
                <FaCamera /> Camera
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={onCloseMediaOptions}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </form>
  );
}
