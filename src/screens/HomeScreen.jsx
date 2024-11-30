import "./HomeScreen.css";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { grabStatus, syncLocalScriptsWithFirestore } from "../control/firebase";
import FullScreenSpinner from "../components/LoadingSpinner";
import { useBalance } from "@/hooks/useBalance";
import { useDittoActivation } from "@/hooks/useDittoActivation";
import TermsOfService from "../components/TermsOfService";
import { useChatHistory } from "@/hooks/useChatHistory";
import ChatFeed from "@/components/ChatFeed";

// Lazy load components
const SendMessage = lazy(() => import("@/components/SendMessage"));
const StatusBar = lazy(() => import("@/components/StatusBar"));
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import dittoIcon from "/icons/ditto-icon-clear2.png";
import { IoSettingsOutline } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { MdFlipCameraIos } from "react-icons/md";
import MiniFocusOverlay from "../components/MiniFocusOverlay";
import MemoryOverlay from "../components/MemoryOverlay";

export default function HomeScreen() {
  const navigate = useNavigate();
  const balance = useBalance();
  const [bootStatus, setBootStatus] = useState("on");
  const { conversation, updateConversation } = useChatHistory();
  const [localScripts, setLocalScripts] = useState({
    webApps: [],
    openSCAD: [],
  });
  const { model: DittoActivation, isLoaded: dittoActivationLoaded } =
    useDittoActivation();
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [showTOS, setShowTOS] = useState(() => {
    return !localStorage.getItem("hasSeenTOS");
  });
  const [isMemoryOverlayOpen, setIsMemoryOverlayOpen] = useState(false);

  const [workingScript, setWorkingScript] = useState(() => {
    const storedScript = localStorage.getItem("workingOnScript");
    if (!storedScript) return null;
    try {
      const parsed = JSON.parse(storedScript);
      return parsed.script || null;
    } catch (e) {
      console.error("Error parsing workingOnScript:", e);
      return null;
    }
  });

  useEffect(() => {
    const latestWorkingOnScript = localStorage.getItem("latestWorkingOnScript");
    if (latestWorkingOnScript) {
      const { script, scriptName } = JSON.parse(latestWorkingOnScript);
      localStorage.removeItem("latestWorkingOnScript");
      navigate("/canvas", { state: { script, scriptName } });
    }
  }, [localStorage.getItem("latestWorkingOnScript")]);

  const localStorageMicrophoneStatus =
    localStorage.getItem("microphoneStatus") === "true";
  const [microphoneStatus, setMicrophoneStatus] = useState(
    localStorageMicrophoneStatus
  );

  function handleMicPress() {
    console.log("handling mic press...");
    localStorage.setItem("microphoneStatus", !microphoneStatus);
    setMicrophoneStatus((prevStatus) => !prevStatus);
    if (microphoneStatus) {
      DittoActivation.stopListening();
    } else {
      DittoActivation.startListening();
    }
  }

  const appBodyRef = useRef(null);

  const syncScripts = async () => {
    const userID = localStorage.getItem("userID");
    if (userID) {
      try {
        if (microphoneStatus) {
          DittoActivation.startListening();
        }
        const webApps = await syncLocalScriptsWithFirestore(userID, "webApps");
        const openSCAD = await syncLocalScriptsWithFirestore(
          userID,
          "openSCAD"
        );
        setLocalScripts({ webApps, openSCAD });
      } catch (e) {
        console.error("Error syncing scripts:", e);
      }
    }
  };

  useEffect(() => {
    syncScripts();

    const handleStatus = async () => {
      var statusDb = await grabStatus();
      if (bootStatus !== statusDb.status) {
        setBootStatus(statusDb.status);
      }
    };

    const syncInterval = setInterval(async () => {
      try {
        await handleStatus();
      } catch (e) {
        console.log(e);
      }
    }, 500);

    return () => clearInterval(syncInterval);
  }, [bootStatus]);

  useEffect(() => {
    const handleResize = () => {
      const chatContainer = appBodyRef.current;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    };

    const handleFocus = (event) => {
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        setTimeout(handleResize, 500);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("focusin", handleFocus);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("focusin", handleFocus);
    };
  }, []);

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();

    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    let lastHeight = window.innerHeight;
    window.addEventListener("scroll", () => {
      if (window.innerHeight !== lastHeight) {
        lastHeight = window.innerHeight;
        setVH();
      }
    });

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
      window.removeEventListener("scroll", setVH);
    };
  }, []);

  const toggleStatusBar = () => {
    setShowStatusBar((prev) => !prev);
  };

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

  const handleTOSClose = () => {
    localStorage.setItem("hasSeenTOS", "true");
    setShowTOS(false);
  };

  const handlePlayScript = () => {
    try {
      let workingOnScript = JSON.parse(localStorage.getItem("workingOnScript"));
      let scriptType = workingOnScript.scriptType;
      let content = workingOnScript.contents;
      let name = workingOnScript.script;
      if (scriptType === "webApps") {
        navigate("/canvas", { state: { script: content, scriptName: name } });
      } else if (scriptType === "openSCAD") {
        downloadOpenscadScript(content, name);
      }
    } catch (error) {
      console.error("Error playing script:", error);
    }
  };

  const handleDeselectScript = () => {
    localStorage.removeItem("workingOnScript");
    setWorkingScript(null);
  };

  return (
    <div className="App" onClick={handleCloseMediaOptions}>
      <header className="App-header">
        <motion.div
          className="microphone-button"
          whileTap={{ scale: 0.95 }}
          onClick={handleMicPress}
        >
          {microphoneStatus ? (
            <FaMicrophone className="icon active" />
          ) : (
            <FaMicrophoneSlash className="icon inactive" />
          )}
        </motion.div>
        {workingScript ? (
          <MiniFocusOverlay
            scriptName={workingScript}
            onPlay={handlePlayScript}
            onDeselect={handleDeselectScript}
          />
        ) : (
          <motion.div
            className="title-container"
            onClick={toggleStatusBar}
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            <img src={dittoIcon} alt="Ditto Icon" className="ditto-icon" />
            <h1 className="App-title">Ditto</h1>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              {showStatusBar ? <IoMdArrowDropup /> : <IoMdArrowDropdown />}
            </motion.div>
          </motion.div>
        )}
        <motion.div
          className="icon-button settings-button"
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/settings")}
        >
          <IoSettingsOutline className="icon" />
        </motion.div>
      </header>
      <AnimatePresence>
        {showStatusBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginBottom: "-4px" }}
          >
            <Suspense
              fallback={
                <div className="loading-placeholder">Loading status...</div>
              }
            >
              <StatusBar onMemoryClick={() => setIsMemoryOverlayOpen(true)} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="App-body"
        ref={appBodyRef}
        onClick={handleCloseMediaOptions}
      >
        <div className="chat-card">
          <Suspense
            fallback={
              <div className="loading-placeholder">Loading chat...</div>
            }
          >
            <ChatFeed />
          </Suspense>
        </div>
      </div>
      <footer className="App-footer">
        <Suspense fallback={<FullScreenSpinner />}>
          <SendMessage
            onImageEnlarge={setEnlargedImage}
            onCameraOpen={handleCameraOpen}
            capturedImage={capturedImage}
            onClearCapturedImage={() => setCapturedImage(null)}
            showMediaOptions={showMediaOptions}
            onOpenMediaOptions={handleOpenMediaOptions}
            onCloseMediaOptions={handleCloseMediaOptions}
            updateConversation={updateConversation}
            onStop={() => {
              balance.refetch();
            }}
          />
        </Suspense>
      </footer>

      {/* Camera Overlay */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            className="CameraOverlay"
            onClick={handleCameraClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="CameraContainer"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <video ref={videoRef} autoPlay className="CameraFeed"></video>
              <div className="CameraControls">
                <MdFlipCameraIos
                  className="FlipCameraIcon"
                  onClick={toggleCamera}
                />
                <button className="CameraSnap" onClick={handleSnap}>
                  Snap
                </button>
                <button className="CameraClose" onClick={handleCameraClose}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

      {showTOS && (
        <TermsOfService onClose={() => setShowTOS(false)} isNewAccount={true} />
      )}

      <AnimatePresence>
        {isMemoryOverlayOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MemoryOverlay closeOverlay={() => setIsMemoryOverlayOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
