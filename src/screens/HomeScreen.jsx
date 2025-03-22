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

export default function HomeScreen() {
  const balance = useBalance();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const { saveScript, setSelectedScript } = useScripts();
  const [fullScreenEdit, setFullScreenEdit] = useState(null);
  const [showTOS, setShowTOS] = useState(() => {
    return !localStorage.getItem("hasSeenTOS");
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const { isIOS, isPWA, isChrome, isAndroid } = usePlatform();
  const { openWhatsNew } = useWhatsNew();
  const appBodyRef = useRef(null);
  const { isMobile } = usePlatform();
  const [isAndroidChrome, setIsAndroidChrome] = useState(false);

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

  // Add platform detection and viewport height management
  useEffect(() => {
    // Check if we're on Android Chrome
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    
    if (isAndroid && isChrome) {
      setIsAndroidChrome(true);
      document.documentElement.classList.add('android-chrome');
      document.body.classList.add('android-chrome');
      
      // Function to update viewport height
      const updateViewportHeight = () => {
        // Use the window's inner height as the true viewport height
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Calculate URL bar offset for adjustments
        const urlBarOffset = Math.max(0, window.outerHeight - window.innerHeight);
        document.documentElement.style.setProperty('--url-bar-offset', `${urlBarOffset}px`);
      };
      
      // Update on resize and orientation change
      window.addEventListener('resize', updateViewportHeight);
      window.addEventListener('orientationchange', updateViewportHeight);
      window.addEventListener('scroll', updateViewportHeight);
      
      // Initial update
      updateViewportHeight();
      
      // Update again after a short delay to catch any UI adjustments
      setTimeout(updateViewportHeight, 100);
      
      // And once more after layout has fully settled
      setTimeout(updateViewportHeight, 500);
      
      return () => {
        window.removeEventListener('resize', updateViewportHeight);
        window.removeEventListener('orientationchange', updateViewportHeight);
        window.removeEventListener('scroll', updateViewportHeight);
      };
    }
    
    // Add iOS Safari detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
      document.documentElement.classList.add('ios-safari');
      document.body.classList.add('ios-safari');
      
      // Set viewport height for iOS
      const setIOSViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      window.addEventListener('resize', setIOSViewportHeight);
      window.addEventListener('orientationchange', setIOSViewportHeight);
      
      setIOSViewportHeight();
      
      return () => {
        window.removeEventListener('resize', setIOSViewportHeight);
        window.removeEventListener('orientationchange', setIOSViewportHeight);
      };
    }
  }, []);

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
    <div className={`app ${isAndroidChrome ? 'android-chrome' : ''}`} onClick={handleCloseMediaOptions}>
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
