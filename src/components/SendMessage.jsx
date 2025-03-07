import "./SendMessage.css";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaPlus,
  FaImage,
  FaCamera,
  FaTimes,
  FaPaperPlane,
  FaExpand,
  FaPlay,
  FaPen,
  FaCode,
} from "react-icons/fa";
import { sendPrompt } from "../control/agent";
import { auth, uploadImageToFirebaseStorageBucket } from "../control/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler";
import { useBalance } from "@/hooks/useBalance";
import { usePlatform } from "@/hooks/usePlatform";
import { useConversationHistory } from "@/hooks/useConversationHistory";
import { useCompose, FullscreenComposeModal } from "@/components/ComposeModal";
import { usePromptStorage } from "@/hooks/usePromptStorage";
import { useScripts } from "@/hooks/useScripts.tsx";
import { useModal } from "@/hooks/useModal";
import SlidingMenu from "@/components/ui/SlidingMenu";
import { IoSettingsOutline } from "react-icons/io5";
import { MdFeedback } from "react-icons/md";
import { FaLaptopCode } from "react-icons/fa";
import { DITTO_AVATAR } from "@/constants";
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
    finalizeOptimisticMessage,
  } = useConversationHistory();
  const {
    message,
    setMessage,
    openComposeModal,
    isWaitingForResponse,
    setIsWaitingForResponse,
    registerSubmitCallback,
  } = useCompose();
  const { clearPrompt } = usePromptStorage();
  const canvasRef = useRef();

  // Ditto logo button state and refs
  const logoButtonRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPinned, setMenuPinned] = useState(false);
  const modal = useModal();
  const openSettingsModal = modal.createOpenHandler("settings");
  const openFeedbackModal = modal.createOpenHandler("feedback");
  const openScriptsOverlay = modal.createOpenHandler("scripts");

  // Script indicator state and refs
  const scriptIndicatorRef = useRef(null);
  const [showScriptActions, setShowScriptActions] = useState(false);
  const openDittoCanvas = modal.createOpenHandler("dittoCanvas");
  const { selectedScript, setSelectedScript, handleDeselectScript } =
    useScripts();

  const handleSubmit = useCallback(
    async (event) => {
      if (event) event.preventDefault();
      if (isWaitingForResponse) return;
      if (message === "" && !image) return;

      // Close the menu if it's open
      if (isMenuOpen) {
        setIsMenuOpen(false);
        setMenuPinned(false);
      }

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
        let messageToSend = message;
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
        clearPrompt();
        setMessage("");
        setImage("");
        resizeTextArea();
        console.log("🚀 [SendMessage] Creating optimistic message");
        const timestamp = Date.now().toString();
        const optimisticId = `msg_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
        const optimisticMessageId = addOptimisticMessage(
          messageToSend,
          imageURI,
          optimisticId,
        );
        const streamingCallback = (chunk) => {
          updateOptimisticResponse(optimisticMessageId, chunk);
        };
        const openScriptCallback = (script) => {
          setSelectedScript(script);
          openDittoCanvas();
        };
        try {
          await sendPrompt(
            userID,
            firstName,
            messageToSend,
            imageURI,
            preferences.data,
            refetch,
            balance.hasPremium ?? false,
            streamingCallback,
            optimisticMessageId,
            finalizeOptimisticMessage,
            openScriptCallback,
            selectedScript,
          );
          console.log("✅ [SendMessage] Prompt completed successfully");
        } catch (error) {
          console.error("❌ [SendMessage] Error in sendPrompt:", error);
          finalizeOptimisticMessage(
            optimisticMessageId,
            "Sorry, an error occurred while processing your request. Please try again.",
          );
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsWaitingForResponse(false);
        onStop();
      }
    },
    [
      isWaitingForResponse,
      message,
      image,
      isMenuOpen,
      setIsWaitingForResponse,
      preferences.data,
      clearPrompt,
      setMessage,
      addOptimisticMessage,
      updateOptimisticResponse,
      selectedScript,
      setSelectedScript,
      openDittoCanvas,
      refetch,
      balance.hasPremium,
      finalizeOptimisticMessage,
      onStop,
    ],
  );

  // Register our submit handler with the compose context
  useEffect(() => {
    registerSubmitCallback(() => handleSubmit());
  }, [registerSubmitCallback, handleSubmit]);

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
        } else if (e.shiftKey) {
          // Allow shift+enter for newlines
          resizeTextArea();
        } else {
          e.preventDefault();
          handleSubmit();
        }
      }
    }
  };

  const resizeTextArea = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "24px";
      const newHeight = Math.max(24, Math.min(textArea.scrollHeight, 200));
      textArea.style.height = `${newHeight}px`;
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

  // Ditto logo button handlers
  const handleHoverStart = () => {
    if (!isMobile && !menuPinned) {
      // Only trigger on desktop when not pinned
      setIsMenuOpen(true);
    }
  };

  const handleHoverEnd = () => {
    if (!isMobile && !menuPinned) {
      // Only trigger on desktop when not pinned
      // Use a short delay to prevent menu from closing immediately
      // when moving cursor from button to menu
      setTimeout(() => {
        // Check if neither the menu nor the logo button is being hovered
        if (
          !document.querySelector(".sliding-menu:hover") &&
          !logoButtonRef.current?.matches(":hover")
        ) {
          setIsMenuOpen(false);
        }
      }, 100);
    }
  };

  const handleLogoClick = () => {
    // Always toggle the menu open/closed
    setIsMenuOpen(!isMenuOpen);

    // On desktop, also handle pinning
    if (!isMobile && !isMenuOpen) {
      setMenuPinned(true);
    }
  };

  // Script indicator handlers
  const handleScriptNameClick = () => {
    setShowScriptActions(!showScriptActions);
  };

  const handlePlayScript = () => {
    if (selectedScript) {
      openDittoCanvas();
    }
  };

  // Handle accessibility keyboard events for buttons
  const handleButtonKeyDown = (event, callback) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  };

  return (
    <>
      <form className="form" onSubmit={handleSubmit} onPaste={handlePaste}>
        <div className="input-wrapper">
          <textarea
            ref={textAreaRef}
            onKeyDown={handleKeyDown}
            onInput={resizeTextArea}
            className="text-area"
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            placeholder="Message Ditto"
            rows={3}
            style={{
              overflowY: "hidden",
              marginRight: "-5px",
            }}
          />
        </div>

        <div className="bottom-buttons-bar">
          <div className="button-hub">
            {/* Full screen button on the left */}
            <div
              className="icon-button action-button expand-button"
              onClick={openComposeModal}
              aria-label="Expand message"
            >
              <FaExpand />
            </div>

            {/* Add Media button next to full screen */}
            <div
              className="icon-button action-button add-media-button"
              onClick={handlePlusClick}
              aria-label="Add media"
            >
              <FaPlus />
            </div>

            {/* Center Ditto logo button */}
            <div className="ditto-button-container">
              <motion.div
                ref={logoButtonRef}
                className="ditto-logo-button"
                whileTap={{ scale: 0.9 }}
                whileHover={{
                  scale: 1.1,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                }}
                onMouseEnter={handleHoverStart}
                onMouseLeave={handleHoverEnd}
                onClick={handleLogoClick}
                onKeyDown={(e) => handleButtonKeyDown(e, handleLogoClick)}
                aria-label="Menu"
                role="button"
                tabIndex={0}
              >
                <img
                  src={DITTO_AVATAR}
                  alt="Ditto"
                  className="ditto-icon-circular"
                />
              </motion.div>

              {/* Hidden sliding menu container for Ditto logo */}
              <div className="ditto-menu-container">
                <SlidingMenu
                  isOpen={isMenuOpen}
                  onClose={() => {
                    setIsMenuOpen(false);
                    setMenuPinned(false);
                  }}
                  position="center"
                  triggerRef={logoButtonRef}
                  isPinned={menuPinned}
                  menuPosition="bottom"
                  menuTitle="Ditto Options"
                  menuItems={[
                    {
                      icon: <MdFeedback className="icon" />,
                      text: "Feedback",
                      onClick: openFeedbackModal,
                    },
                    {
                      icon: <FaLaptopCode className="icon" />,
                      text: "Scripts",
                      onClick: openScriptsOverlay,
                    },
                    {
                      icon: <IoSettingsOutline className="icon" />,
                      text: "Settings",
                      onClick: openSettingsModal,
                    },
                  ]}
                />
              </div>
            </div>

            {/* Script indicator button (shows only when a script is selected) */}
            {selectedScript && (
              <motion.div
                className="script-icon-button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleScriptNameClick}
                ref={scriptIndicatorRef}
                title={selectedScript.script}
              >
                <FaCode />
              </motion.div>
            )}

            {/* Send button on the right */}
            <button
              className={`icon-button submit ${isWaitingForResponse ? "disabled" : ""}`}
              type="submit"
              disabled={isWaitingForResponse}
              aria-label="Send message"
            >
              <FaPaperPlane />
            </button>

            <input
              id="image-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>

          {/* Hidden sliding menu container for script actions */}
          {selectedScript && (
            <div style={{ position: "relative", width: "0", height: "0" }}>
              <SlidingMenu
                isOpen={showScriptActions}
                onClose={() => setShowScriptActions(false)}
                position="right"
                triggerRef={scriptIndicatorRef}
                menuPosition="bottom"
                menuTitle={selectedScript.script}
                menuItems={[
                  {
                    icon: <FaPlay className="icon" />,
                    text: "Launch Script",
                    onClick: handlePlayScript,
                  },
                  {
                    icon: <FaPen className="icon" />,
                    text: "Edit Script",
                    onClick: () => {
                      if (selectedScript) {
                        const event = new CustomEvent("editScript", {
                          detail: {
                            script: {
                              name: selectedScript.script,
                              content: selectedScript.contents,
                              scriptType: selectedScript.scriptType,
                            },
                          },
                        });
                        window.dispatchEvent(event);
                      }
                    },
                  },
                  {
                    icon: <FaTimes className="icon" />,
                    text: "Deselect Script",
                    onClick: handleDeselectScript,
                  },
                ]}
              />
            </div>
          )}
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
