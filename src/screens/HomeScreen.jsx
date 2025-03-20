import { useState, useEffect, useRef, Suspense } from "react";
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner";
import { useBalance } from "@/hooks/useBalance";
import TermsOfService from "@/components/TermsOfService";
import { motion, AnimatePresence } from "framer-motion";
import { MdFlipCameraIos } from "react-icons/md";
import ChatFeed from "@/components/ChatFeed";
import SendMessage from "@/components/SendMessage";
import FullScreenEditor from "@/screens/Editor/FullScreenEditor";
import { useScripts } from "@/hooks/useScripts";
import { usePlatform } from "@/hooks/usePlatform";
import useWhatsNew from "@/hooks/useWhatsNew";
import { getUpdateState } from "@/utils/updateService";
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
  const { isIOS, isPWA } = usePlatform();
  const { setSelectedScript, saveScript } = useScripts();
  const { openWhatsNew } = useWhatsNew();

  const appBodyRef = useRef(null);

  // Handle showing What's New modal when app is reloaded after update
  useEffect(() => {
    const forceReloadLazy =
      localStorage.getItem("force-reload-lazy") === "true";
    if (forceReloadLazy) {
      console.log("App mounted after update - clearing force-reload-lazy flag");
      localStorage.removeItem("force-reload-lazy");

      // Show What's New modal when app is reloaded after update
      const storedVersionToShow = localStorage.getItem(
        "show-whats-new-version",
      );
      if (storedVersionToShow) {
        // Use the stored version that was saved before the update
        openWhatsNew(storedVersionToShow);
        localStorage.removeItem("show-whats-new-version");
      } else {
        // Fallback to current version from updateState
        const updateState = getUpdateState();
        if (updateState.currentVersion) {
          openWhatsNew(updateState.currentVersion);
        }
      }
    }
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
      
      // Special handling for Chrome on Android to account for URL bar
      const isAndroid = /android/i.test(navigator.userAgent);
      const isChrome = /chrome/i.test(navigator.userAgent) && !isIOS;
      
      if (isAndroid && isChrome) {
        // Chrome on Android needs special handling for the URL bar
        // Set a specific height for the app content
        const chromeVh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--chrome-vh", `${chromeVh}px`);
        
        // Calculate the URL bar offset more reliably using visualViewport
        const visualHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const urlBarOffset = Math.max(0, window.innerHeight - visualHeight);
        
        // Set a safe area value for the bottom navigation gesture area
        // Modern Android devices typically have 16-24px for gesture area
        const safeAreaBottom = window.innerHeight > 700 ? 16 : 0;
        
        // Set CSS variables for layout calculations
        document.documentElement.style.setProperty("--url-bar-offset", `${urlBarOffset}px`);
        document.documentElement.style.setProperty("--safe-area-bottom", `${safeAreaBottom}px`);
        
        // Apply to button hub and input wrapper with updated calculations
        const buttonHub = document.querySelector(".button-hub");
        const inputWrapper = document.querySelector(".input-wrapper");
        if (buttonHub) {
          buttonHub.style.bottom = `${urlBarOffset}px`;
          buttonHub.style.paddingBottom = `${safeAreaBottom + 8}px`;
        }
        if (inputWrapper) {
          inputWrapper.style.bottom = `calc(${urlBarOffset}px + 50px + ${safeAreaBottom}px)`;
        }
      }
    };

    // Initial set
    setVH();

    // Add event listeners for various events that might change the viewport
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    window.addEventListener("scroll", setVH);
    
    // For Chrome, we need additional events to catch all changes
    window.addEventListener("touchmove", setVH);
    window.addEventListener("touchend", setVH);

    // Use visualViewport API for more accurate measurements on supported browsers
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setVH);
      window.visualViewport.addEventListener("scroll", setVH);
    }

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
        window.removeEventListener("touchmove", setVH);
        window.removeEventListener("touchend", setVH);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", setVH);
          window.visualViewport.removeEventListener("scroll", setVH);
        }
        clearInterval(safariHeightTimer);
      };
    }

    // Set a timer to periodically check viewport size on Android Chrome
    const androidHeightTimer = setInterval(() => {
      if (/android/i.test(navigator.userAgent) && /chrome/i.test(navigator.userAgent)) {
        setVH();
      }
    }, 500);

    return () => {
      // Clean up event listeners
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
      window.removeEventListener("scroll", setVH);
      window.removeEventListener("touchmove", setVH);
      window.removeEventListener("touchend", setVH);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", setVH);
        window.visualViewport.removeEventListener("scroll", setVH);
      }
      
      clearInterval(androidHeightTimer);
    };
  }, [isIOS, isPWA]);

  useEffect(() => {
    // Identify Android Chrome and add special classes
    const isAndroid = /android/i.test(navigator.userAgent);
    const isChrome = /chrome/i.test(navigator.userAgent) && !isIOS;
    
    if (isAndroid && isChrome) {
      // Add special classes for Android Chrome
      document.documentElement.classList.add('android-chrome');
      document.body.classList.add('android-chrome');
      
      // Set a specific meta viewport tag for Android Chrome
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute(
          "content",
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1.0, user-scalable=no"
        );
      }
      
      // Force a repaint to apply the classes immediately
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger a reflow
      document.body.style.display = '';
    }
    
    return () => {
      // Clean up classes when component unmounts
      document.documentElement.classList.remove('android-chrome');
      document.body.classList.remove('android-chrome');
    };
  }, [isIOS]);

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

  return (
    <div className="app" onClick={handleCloseMediaOptions}>
      {/* Floating header has been moved to the bottom buttons bar */}
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
