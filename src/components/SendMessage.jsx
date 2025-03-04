import "./SendMessage.css";
import { useState, useEffect, useRef } from "react";
import { FaPlus, FaImage, FaCamera, FaTimes, FaPaperPlane, FaExpand } from "react-icons/fa";
import { sendPrompt } from "../control/agent";
import { auth, uploadImageToFirebaseStorageBucket } from "../control/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler";
import { useBalance } from "@/hooks/useBalance";
import { usePlatform } from "@/hooks/usePlatform";
import { useConversationHistory } from "@/hooks/useConversationHistory";
import { useCompose, FullscreenComposeModal } from "@/components/ComposeModal";
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
  const [image, setImage] = useState(capturedImage || "");
  const textAreaRef = useRef(null);
  const preferences = useModelPreferences();
  const { openImageViewer } = useImageViewerHandler();
  const balance = useBalance();
  const { isMobile } = usePlatform();
  const { 
    refetch, 
    addOptimisticMessage, 
    updateOptimisticResponse, 
    finalizeOptimisticMessage 
  } = useConversationHistory();
  
  // Use the compose context instead of local state
  const { 
    message, 
    setMessage, 
    openComposeModal, 
    isWaitingForResponse, 
    setIsWaitingForResponse,
    registerSubmitCallback
  } = useCompose();

  const finalTranscriptRef = useRef("");
  const canvasRef = useRef();
  
  // Register our submit handler with the compose context
  useEffect(() => {
    registerSubmitCallback(() => handleSubmit());
  }, [registerSubmitCallback]);

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

      // Clear the input message state
      setMessage("");
      setImage("");
      finalTranscriptRef.current = "";
      resizeTextArea();
      
      // The prompt will be cleared automatically when handleSubmit is called

      // Add optimistic message to the UI immediately
      console.log("🚀 [SendMessage] Creating optimistic message");
      const optimisticId = addOptimisticMessage(messageToSend, imageURI);

      // Pass streaming callback to update UI in real time
      const streamingCallback = (chunk) => {
        console.log(`🔄 [SendMessage] Received streaming chunk of ${chunk.length} chars, updating optimistic message: ${optimisticId}`);
        updateOptimisticResponse(optimisticId, chunk);
      };

      try {
        console.log("🚀 [SendMessage] Sending prompt with optimistic ID:", optimisticId);
        
        // Pass the optimistic ID and streaming callback to sendPrompt
        await sendPrompt(
          userID,
          firstName,
          messageToSend,
          imageURI,
          null,
          preferences.data,
          refetch,
          balance.hasPremium ?? false,
          streamingCallback,
          optimisticId,
          finalizeOptimisticMessage
        );
        
        console.log("✅ [SendMessage] Prompt completed successfully");
      } catch (error) {
        console.error("❌ [SendMessage] Error in sendPrompt:", error);
        // If there was an error, we should finalize the optimistic message with an error state
        finalizeOptimisticMessage(optimisticId, "Sorry, an error occurred while processing your request. Please try again.");
      }
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

      const imagePreview = document.querySelector(".image-preview");
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
    <>
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
        </div>
        
        <div className="bottom-buttons-bar">
          <div className="action-buttons">
            <div className="action-button" onClick={handlePlusClick}>
              <FaPlus />
            </div>
            <div className="action-button" onClick={openComposeModal}>
              <FaExpand />
            </div>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>
          <button
            className={`submit ${isWaitingForResponse ? "disabled" : ""}`}
            type="submit"
            disabled={isWaitingForResponse}
          >
            <FaPaperPlane />
          </button>
        </div>

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
              className="action-menu-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMediaOptions}
            >
              <motion.div
                className="action-menu"
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleGalleryClick}
                >
                  <FaImage /> Photo Gallery
                </button>
                <button
                  type="button"
                  className="action-menu-item"
                  onClick={handleCameraClick}
                >
                  <FaCamera /> Camera
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      </form>
      
      <FullscreenComposeModal />
    </>
  );
}
