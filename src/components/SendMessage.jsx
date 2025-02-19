import "./SendMessage.css";
import { useState, useEffect, useRef } from "react";
import { FaPlus, FaImage, FaCamera, FaTimes } from "react-icons/fa";
import { sendPrompt } from "../control/agent";
import { auth, uploadImageToFirebaseStorageBucket } from "../control/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { useIsMobile } from "../hooks/useIsMobile";

const INACTIVITY_TIMEOUT = 2000; // 2 seconds

/**
 * A component that allows the user to send a message to the agent
 * @param {Object} props - The component props
 * @param {function(imageUrl: string): void} props.onImageEnlarge - A function that enlarges an image
 * @param {function(): void} props.onCameraOpen - A function that opens the camera
 * @param {string} props.capturedImage - The URL of the captured image
 * @param {function(): void} props.onClearCapturedImage - A function that clears the captured image
 * @param {boolean} props.showMediaOptions - Whether the media options are shown
 * @param {function(): void} props.onOpenMediaOptions - A function that opens the media options
 * @param {function(): void} props.onCloseMediaOptions - A function that closes the media options
 * @param {function} props.updateConversation - A function that updates the conversation
 * @param {function} props.onFocus - A function that handles the focus event
 * @param {function(): void} props.onBlur - A function that handles the blur event
 * @param {function(): void} props.onStop - A function that handles the stop event
 */
export default function SendMessage({
  onImageEnlarge,
  onCameraOpen,
  capturedImage,
  onClearCapturedImage,
  showMediaOptions,
  onOpenMediaOptions,
  onCloseMediaOptions,
  updateConversation,
  onFocus,
  onBlur,
  onStop,
}) {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const textAreaRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const canvasRef = useRef();
  const isMobile = useIsMobile();
  const [isImageEnlarged, setIsImageEnlarged] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const { preferences } = useModelPreferences();

  useEffect(() => {
    if (capturedImage) {
      setImage(capturedImage);
    }
  }, [capturedImage]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImage("");
    onClearCapturedImage();
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();

    const thinkingObjectString = localStorage.getItem("thinking");
    const isThinking = thinkingObjectString !== null;

    if (isWaitingForResponse) return;

    if ((message !== "" || finalTranscriptRef.current) && !isThinking) {
      setIsWaitingForResponse(true);
      try {
        const userID = auth.currentUser.uid;
        const firstName = localStorage.getItem("firstName");
        let messageToSend = finalTranscriptRef.current || message;
        let imageURI = "";
        if (image) {
          imageURI = await uploadImageToFirebaseStorageBucket(image, userID);
          messageToSend = `![image](${imageURI})\n\n${messageToSend}`;
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
          updateConversation,
          preferences
        );
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsWaitingForResponse(false);
        onStop();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (isMobile) {
      // On mobile, Enter always creates a new line
      if (e.key === "Enter") {
        e.preventDefault();
        setMessage((prevMessage) => prevMessage + "\n");
        resizeTextArea();
      }
    } else {
      // On web
      if (e.key === "Enter") {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Enter or Cmd+Enter adds a new line
          e.preventDefault();
          setMessage((prevMessage) => prevMessage + "\n");
          resizeTextArea();
        } else if (!e.shiftKey) {
          // Enter (without Shift) submits the form
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

  // Add this new function to handle pasted data
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

  const toggleImageEnlarge = (e) => {
    e.stopPropagation();
    onImageEnlarge(image);
  };

  const toggleImageFullscreen = (e) => {
    e.stopPropagation();
    setIsImageFullscreen(!isImageFullscreen);
  };

  const handleClickOutside = () => {
    if (isImageFullscreen) {
      setIsImageFullscreen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isImageFullscreen]);

  const handlePlusClick = (e) => {
    e.stopPropagation();
    onOpenMediaOptions();
  };

  const handleGalleryClick = (e) => {
    e.preventDefault(); // Add this line
    e.stopPropagation();
    document.getElementById("image-upload").click();
    onCloseMediaOptions();
  };

  const handleCameraClick = (e) => {
    e.preventDefault(); // Add this line
    e.stopPropagation();
    onCameraOpen();
    onCloseMediaOptions();
  };

  return (
    <form className="Form" onSubmit={handleSubmit}>
      <div className="InputWrapper">
        <textarea
          ref={textAreaRef}
          onKeyDown={handleKeyDown}
          onInput={resizeTextArea}
          onPaste={handlePaste}
          className="TextArea"
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
          onFocus={() => setIsImageEnlarged(false)}
        />
        <div className="IconsWrapper">
          <FaPlus className="PlusButton" onClick={handlePlusClick} />
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
        className={`Submit ${isWaitingForResponse ? "disabled" : ""}`}
        type="submit"
        value="Send"
        disabled={isWaitingForResponse}
      />

      {image && (
        <div className="ImagePreview" onClick={toggleImageEnlarge}>
          <img src={image} alt="Preview" />
          <FaTimes
            className="RemoveImage"
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
            className="MediaOptionsOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMediaOptions}
          >
            <motion.div
              className="MediaOptionsContent"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button" // Add this
                className="MediaOption"
                onClick={handleGalleryClick}
              >
                <FaImage /> Photo Gallery
              </button>
              <button
                type="button" // Add this
                className="MediaOption"
                onClick={handleCameraClick}
              >
                <FaCamera /> Camera
              </button>
              <button
                type="button" // Add this
                className="CancelButton"
                onClick={onCloseMediaOptions}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isImageEnlarged && (
        <div className="EnlargedImageOverlay" onClick={toggleImageEnlarge}>
          <div
            className="EnlargedImageContainer"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={image} alt="Enlarged Preview" />
          </div>
        </div>
      )}

      {isImageFullscreen && (
        <div className="FullscreenImageOverlay" onClick={handleClickOutside}>
          <img
            src={image}
            alt="Fullscreen Preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </form>
  );
}
