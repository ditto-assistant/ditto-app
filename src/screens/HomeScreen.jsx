import { useState, useEffect, useRef, Suspense } from "react";
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner";
import { useBalance } from "@/hooks/useBalance";
import TermsOfService from "@/components/TermsOfService";
import dittoIcon from "/icons/ditto-icon-clear.png";
import { IoSettingsOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { MdFlipCameraIos, MdFeedback } from "react-icons/md";
import { FaLaptopCode, FaPlay, FaPen, FaTimes } from "react-icons/fa";
import SlidingMenu from "@/components/ui/SlidingMenu";
import ChatFeed from "@/components/ChatFeed";
import SendMessage from "@/components/SendMessage";
import FullScreenEditor from "@/screens/Editor/FullScreenEditor";
import { useModal } from "@/hooks/useModal";
import { useScripts } from "@/hooks/useScripts.tsx";
import { usePlatform } from "@/hooks/usePlatform";
import useWhatsNew from "@/hooks/useWhatsNew";
import "@/styles/buttons.css";
import "./HomeScreen.css";
const MEMORY_DELETED_EVENT = "memoryDeleted";

export default function HomeScreen() {
  const balance = useBalance();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [showTOS, setShowTOS] = useState(() => {
    return !localStorage.getItem("hasSeenTOS");
  });
  const [fullScreenEdit, setFullScreenEdit] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const modal = useModal();
  const openSettingsModal = modal.createOpenHandler("settings");
  const openFeedbackModal = modal.createOpenHandler("feedback");
  const openDittoCanvas = modal.createOpenHandler("dittoCanvas");
  const openScriptsOverlay = modal.createOpenHandler("scripts");
  const { isIOS, isPWA, isMobile } = usePlatform();
  const {
    selectedScript,
    setSelectedScript,
    handleDeselectScript,
    saveScript,
  } = useScripts();
  const { openWhatsNew } = useWhatsNew();

  const appBodyRef = useRef(null);

  // Show the What's New dialog for the UI redesign
  useEffect(() => {
    // Show the What's New dialog for version 0.11.56
    setTimeout(() => {
      openWhatsNew("0.11.56");
    }, 500);
  }, [openWhatsNew]);

  useEffect(() => {
    // Update the existing useEffect that handles viewport height
    const setVH = () => {
      // First get the viewport height and multiply it by 1% to get a value for a vh unit
      let vh = window.innerHeight * 0.01;

      // For iOS Safari, use the visualViewport API for more accurate measurements
      if (isIOS && window.visualViewport) {
        vh = window.visualViewport.height * 0.01;
      }

      // Then set the value in the --vh custom property to the root of the document
      document.documentElement.style.setProperty("--vh", `${vh}px`);

      // Simple approach - don't add extra space in PWA mode
      if (isIOS) {
        const extraSpace = isPWA ? 0 : 20; // No extra space needed in PWA mode
        const iosVh = (window.innerHeight + extraSpace) * 0.01;
        document.documentElement.style.setProperty("--ios-vh", `${iosVh}px`);
      }
    };

    // Initial set
    setVH();

    // Add event listeners for various events that might change the viewport
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    window.addEventListener("scroll", setVH);

    // Special handling for iOS to help with browser chrome appearing/disappearing
    if (isIOS) {
      // Add meta viewport tag to prevent scaling issues
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute(
          "content",
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1.0, user-scalable=no",
        );
      }

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", setVH);
        window.visualViewport.addEventListener("scroll", setVH);
      }

      // Set a timer to periodically check viewport size on iOS
      const safariHeightTimer = setInterval(setVH, 500);

      // Also check after a brief delay for when the page first loads
      setTimeout(setVH, 300);

      return () => {
        // Clean up event listeners
        window.removeEventListener("resize", setVH);
        window.removeEventListener("orientationchange", setVH);
        window.removeEventListener("scroll", setVH);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", setVH);
          window.visualViewport.removeEventListener("scroll", setVH);
        }
        clearInterval(safariHeightTimer);
      };
    }

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
      window.removeEventListener("scroll", setVH);
    };
  }, [isIOS, isPWA]);

  const handleCameraOpen = () => {
    setIsCameraOpen(true);
    startCamera(isFrontCamera);
  };

  const handleCameraClose = () => {
    setIsCameraOpen(false);
    stopCameraFeed();
  };

  const startCamera = (useFrontCamera) => {
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: useFrontCamera ? "user" : "environment" },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing the camera: ", err);
      });
  };

  const stopCameraFeed = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleSnap = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageDataURL = canvasRef.current.toDataURL("image/png");
      setCapturedImage(imageDataURL);
      handleCameraClose();
    }
  };

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    stopCameraFeed();
    startCamera(!isFrontCamera);
  };

  const handleCloseMediaOptions = () => {
    setShowMediaOptions(false);
  };

  const handleOpenMediaOptions = () => {
    setShowMediaOptions(true);
  };

  // Update the useEffect that listens for memory deletion events
  useEffect(() => {
    const handleMemoryDeleted = (event) => {
      // Update histCount state with the new count
      const { newHistCount } = event.detail;
      setCount(newHistCount);

      // Get the latest data from localStorage
      const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
      const responses = JSON.parse(localStorage.getItem("responses") || "[]");
      const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");
      const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");

      // Create new conversation object
      const newConversation = {
        messages: [
          { sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() },
        ],
        is_typing: false,
      };

      // Rebuild messages array with latest data including pairIDs
      for (let i = 0; i < prompts.length; i++) {
        newConversation.messages.push({
          sender: "User",
          text: prompts[i],
          timestamp: timestamps[i],
          pairID: pairIDs[i],
        });
        newConversation.messages.push({
          sender: "Ditto",
          text: responses[i],
          timestamp: timestamps[i],
          pairID: pairIDs[i],
        });
      }

      // Update the conversation state with new data
      setConversation(newConversation);
    };

    window.addEventListener(MEMORY_DELETED_EVENT, handleMemoryDeleted);

    return () => {
      window.removeEventListener(MEMORY_DELETED_EVENT, handleMemoryDeleted);
    };
  }, []);

  // Functions for play, edit, and deselect actions
  const handlePlayScript = () => {
    try {
      if (selectedScript) {
        openDittoCanvas();
      }
    } catch (error) {
      console.error("Error playing script:", error);
    }
  };

  const [showScriptActions, setShowScriptActions] = useState(false);

  const handleScriptNameClick = () => {
    setShowScriptActions(!showScriptActions);
  };

  useEffect(() => {
    const handleEditScript = (event) => {
      const { script } = event.detail;
      setFullScreenEdit({
        ...script,
        onSaveCallback: async (newContent) => {
          try {
            // Use the script manager to save
            await saveScript(newContent, script.scriptType, script.name);

            // Select the script using script manager with proper field names
            setSelectedScript({
              name: script.name,
              content: newContent,
              scriptType: script.scriptType,
            });

            setFullScreenEdit(null);
            window.dispatchEvent(new Event("scriptsUpdated"));
          } catch (error) {
            console.error("Error saving:", error);
          }
        },
      });
    };

    window.addEventListener("editScript", handleEditScript);
    return () => {
      window.removeEventListener("editScript", handleEditScript);
    };
  }, [saveScript, setSelectedScript]);

  useEffect(() => {
    const handleCloseFullScreenEditor = () => {
      setFullScreenEdit(null);
    };

    window.addEventListener(
      "closeFullScreenEditor",
      handleCloseFullScreenEditor,
    );
    return () => {
      window.removeEventListener(
        "closeFullScreenEditor",
        handleCloseFullScreenEditor,
      );
    };
  }, []);

  // Handle keyboard events for accessibility
  const handleKeyDown = (event, callback) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  };

  // Hover and click handling for the menu
  const logoButtonRef = useRef(null);
  const scriptIndicatorRef = useRef(null);
  const [menuPinned, setMenuPinned] = useState(false);

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
    if (!isMobile) {
      // On desktop, clicking toggles pinned state
      if (isMenuOpen) {
        // If already open, toggle the pin state
        setMenuPinned(!menuPinned);
      } else {
        // If closed, open and pin
        setIsMenuOpen(true);
        setMenuPinned(true);
      }
    } else {
      // On mobile, just toggle menu open/closed
      setIsMenuOpen(!isMenuOpen);
    }
  };

  return (
    <div className="app" onClick={handleCloseMediaOptions}>
      <div className="floating-header">
        {/* Ditto Logo Button with sliding menu */}
        <div className="ditto-menu-container">
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
            onKeyDown={(e) => handleKeyDown(e, handleLogoClick)}
            aria-label="Menu"
            role="button"
            tabIndex={0}
          >
            <img src={dittoIcon} alt="Ditto" className="ditto-icon-circular" />
          </motion.div>

          {/* Sliding menu using the reusable component */}
          <SlidingMenu
            isOpen={isMenuOpen}
            onClose={() => {
              setIsMenuOpen(false);
              setMenuPinned(false);
            }}
            position="left"
            triggerRef={logoButtonRef}
            isPinned={menuPinned}
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

        {/* Script Indicator - only shows when script is selected */}
        <AnimatePresence>
          {selectedScript && (
            <div className="script-indicator-container">
              <motion.div
                className="floating-script-indicator"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleScriptNameClick}
                ref={scriptIndicatorRef}
              >
                <span className="script-name">{selectedScript.script}</span>
              </motion.div>

              {/* Script actions using the sliding menu component */}
              <SlidingMenu
                isOpen={showScriptActions}
                onClose={() => setShowScriptActions(false)}
                position="right"
                triggerRef={scriptIndicatorRef}
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
                      setFullScreenEdit({
                        name: selectedScript.script,
                        content: selectedScript.contents,
                        scriptType: selectedScript.scriptType,
                        onSaveCallback: async (updatedContent) => {
                          try {
                            await saveScript(
                              updatedContent,
                              selectedScript.scriptType,
                              selectedScript.script,
                            );
                            setFullScreenEdit(null);
                          } catch (e) {
                            console.error("Error updating script:", e);
                          }
                        },
                      });
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
        </AnimatePresence>
      </div>
      {/* Status bar has been removed */}
      <Suspense fallback={<FullScreenSpinner />}>
        <div className="app-content-wrapper">
          <div
            className="app-body"
            ref={appBodyRef}
            onClick={handleCloseMediaOptions}
          >
            <ChatFeed />
          </div>
          <div className="app-footer">
            <SendMessage
              onCameraOpen={handleCameraOpen}
              capturedImage={capturedImage}
              onClearCapturedImage={() => setCapturedImage(null)}
              showMediaOptions={showMediaOptions}
              onOpenMediaOptions={handleOpenMediaOptions}
              onCloseMediaOptions={handleCloseMediaOptions}
              onStop={() => {
                balance.refetch();
              }}
            />
          </div>
        </div>
      </Suspense>

      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            className="camera-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCameraClose}
          >
            <motion.div
              className="camera-container"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <video ref={videoRef} autoPlay className="camera-feed"></video>
              <div className="camera-controls">
                <MdFlipCameraIos
                  className="flip-camera-icon"
                  onClick={toggleCamera}
                />
                <button className="camera-snap" onClick={handleSnap}>
                  Snap
                </button>
                <button className="camera-close" onClick={handleCameraClose}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

      {showTOS && (
        <TermsOfService
          onClose={() => setShowTOS(false)}
          isNewAccount={true} // Always show Accept/Decline for users who haven't accepted TOS
        />
      )}

      {/* ScriptActionsOverlay has been removed and replaced with the SlidingMenu in the floating-script-indicator */}

      {fullScreenEdit && (
        <FullScreenEditor
          script={fullScreenEdit}
          onClose={() => setFullScreenEdit(null)}
          onSave={fullScreenEdit.onSaveCallback}
        />
      )}
    </div>
  );
}
