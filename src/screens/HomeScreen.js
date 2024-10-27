import "./App.css";
import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { grabStatus, syncLocalScriptsWithFirestore, } from "../control/firebase";
import { MdSettings } from "react-icons/md";
import { FaEarListen, FaEarDeaf } from "react-icons/fa6";
import FullScreenSpinner from "../components/LoadingSpinner";
import { Divider } from "@mui/material";
import { useBalance } from "@/hooks/useBalance";
import { useDittoActivation } from "@/hooks/useDittoActivation";
// Lazy load components
const ChatFeed = lazy(() => import("@/components/ChatFeed"));
const SendMessage = lazy(() => import("@/components/SendMessage"));
const StatusBar = lazy(() => import("@/components/StatusBar"));
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import dittoIcon from '/icons/ditto-icon-clear2.png';
import { IoSettingsOutline } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { MdFlipCameraIos } from "react-icons/md";

export default function HomeScreen() {
  const navigate = useNavigate();
  const balance = useBalance();
  const [bootStatus, setBootStatus] = useState("on");
  const [startAtBottom, setStartAtBottom] = useState(true);
  const [histCount, setCount] = useState(localStorage.getItem("histCount") || 0);
  const [localScripts, setLocalScripts] = useState({
    webApps: [],
    openSCAD: [],
  });
  const { model: DittoActivation, isLoaded: dittoActivationLoaded } = useDittoActivation();
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);

  // check for localStorage item latestWorkingOnScript which contains JSON of script and scriptName and navigate to canvas with that script
  // canvas takes the script and scriptName as props
  useEffect(() => {
    const latestWorkingOnScript = localStorage.getItem("latestWorkingOnScript");
    if (latestWorkingOnScript) {
      const { script, scriptName } = JSON.parse(latestWorkingOnScript);
      localStorage.removeItem("latestWorkingOnScript");
      navigate("/canvas", { state: { script, scriptName } });
    }
  }
    , [localStorage.getItem("latestWorkingOnScript")]);

  const createConversation = (hist, reset, onload) => {
    try {
      let newConversation = {
        messages: [{ sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() }],
        is_typing: false,
      };
      if (reset) {
        setConversation(newConversation);
        return;
      }
      let prompts = hist.prompts || [];
      let responses = hist.responses || [];
      let timestamps = hist.timestamps || [];
      for (let i = 0; i < prompts.length; i++) {
        let prompt = prompts[i];
        let response = responses[i];
        let timestamp = timestamps[i];
        newConversation.messages.push({ sender: "User", text: prompt, timestamp: timestamp });
        newConversation.messages.push({ sender: "Ditto", text: response, timestamp: timestamp });
      }
      if (onload) {
        return newConversation;
      } else {
        setStartAtBottom(false);
        setConversation(newConversation);
      }

    } catch (e) {
      console.log(e);
    }
  };

  const getSavedConversation = () => {
    let prompts = JSON.parse(localStorage.getItem("prompts"));
    let responses = JSON.parse(localStorage.getItem("responses"));
    let timestamps = JSON.parse(localStorage.getItem("timestamps"));
    return { prompts, responses, timestamps };
  };

  let convo = getSavedConversation();
  let previousConversation = createConversation(convo, false, true)
  const [conversation, setConversation] = useState(previousConversation);

  const localStorageMicrophoneStatus = localStorage.getItem("microphoneStatus") === "true";
  const [microphoneStatus, setMicrophoneStatus] = useState(localStorageMicrophoneStatus);

  let buttonSize = 25;

  function handleMicPress() {
    console.log("handling mic press...");
    localStorage.setItem("microphoneStatus", !microphoneStatus);
    setMicrophoneStatus((prevStatus) => !prevStatus);
    // if mic status is false stop listening for name
    if (microphoneStatus) {
      DittoActivation.stopListening();
    } else {
      DittoActivation.startListening();
    }
  };

  const appBodyRef = useRef(null);

  // check for localStorage memoryWipe being set to true and reset cound and create new conversation
  useEffect(() => {
    if (localStorage.getItem("resetMemory") === "true") {
      localStorage.setItem("resetMemory", "false");
      setCount(0);
      createConversation({ prompts: [], responses: [], timestamps: [] }, true);
    }
  }, [localStorage.getItem("resetMemory")]);

  const syncScripts = async () => {
    const userID = localStorage.getItem("userID");
    if (userID) {
      try {
        // start Dittos activation if microphone is on
        if (microphoneStatus) {
          DittoActivation.startListening();
        }
        const webApps = await syncLocalScriptsWithFirestore(userID, "webApps");
        const openSCAD = await syncLocalScriptsWithFirestore(userID, "openSCAD");
        setLocalScripts({ webApps, openSCAD });
      } catch (e) {
        console.error("Error syncing scripts:", e);
      }
    }
  };


  const syncConversationHist = async () => {
    const localHistCount = parseInt(localStorage.getItem("histCount"));
    const thinkingObjectString = localStorage.getItem("thinking");

    if (thinkingObjectString !== null && conversation.is_typing === false) {
      const thinkingObject = JSON.parse(thinkingObjectString);
      const usersPrompt = thinkingObject.prompt;

      setConversation((prevState) => {
        const newMessages = [
          ...prevState.messages,
          { sender: "User", text: usersPrompt, timestamp: Date.now() },
        ];
        return {
          ...prevState,
          messages: newMessages,
          is_typing: true,
        };
      });
    }

    if (histCount < localHistCount) {
      setCount(localHistCount);
      const localHist = getSavedConversation();
      createConversation(localHist, false);
    }

    if (isNaN(localHistCount)) {
      setCount(0);
    }
  };


  useEffect(() => {
    syncScripts();
    balance.refetch();
    const handleStatus = async () => {
      var statusDb = await grabStatus();
      if (bootStatus !== statusDb.status) {
        setBootStatus(statusDb.status);
      }
    };

    const syncInterval = setInterval(async () => {
      try {
        await handleStatus();
        await syncConversationHist();
      } catch (e) {
        console.log(e);
      }
    }, 500);

    return () => clearInterval(syncInterval);
  }, [conversation]);

  useEffect(() => {
    const handleResize = () => {
      const chatContainer = appBodyRef.current;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    };

    const handleFocus = (event) => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
        setTimeout(handleResize, 500); // Timeout to wait for keyboard to simply open
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
    // Add this new effect to adjust for mobile browsers
    const adjustViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    adjustViewportHeight();
    window.addEventListener('resize', adjustViewportHeight);

    return () => window.removeEventListener('resize', adjustViewportHeight);
  }, []);

  const toggleStatusBar = () => {
    setShowStatusBar((prev) => !prev);
  };

  const handleImageEnlarge = (imageUrl) => {
    setEnlargedImage(imageUrl);
  };

  const closeEnlargedImage = () => {
    setEnlargedImage(null);
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
      .getUserMedia({ video: { facingMode: useFrontCamera ? 'user' : 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing the camera: ', err);
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
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageDataURL = canvasRef.current.toDataURL('image/png');
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
        <motion.div
          className="title-container"
          onClick={toggleStatusBar}
          whileHover={{ scale: 1.05 }}
        >
          <img src={dittoIcon} alt="Ditto Icon" className="ditto-icon" />
          <h1 className="App-title">Ditto</h1>
          {showStatusBar ? <IoMdArrowDropup /> : <IoMdArrowDropdown />}
        </motion.div>
        <motion.div
          className="settings-button"
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
            style={{ marginBottom: '-4px' }}
          >
            <Suspense fallback={<div className="loading-placeholder">Loading status...</div>}>
              <StatusBar />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="App-body" ref={appBodyRef} onClick={handleCloseMediaOptions}>
        <div className="chat-card">
          <Suspense fallback={<div className="loading-placeholder">Loading chat...</div>}>
            <ChatFeed
              messages={conversation.messages}
              showSenderName={false}
              histCount={histCount}
              isTyping={conversation.is_typing}
              scrollToBottom={true}
              startAtBottom={startAtBottom}
            />
          </Suspense>
        </div>
      </div>
      <footer className="App-footer">
        <Suspense fallback={<FullScreenSpinner />}>
          <SendMessage 
            onImageEnlarge={handleImageEnlarge} 
            onCameraOpen={handleCameraOpen} 
            capturedImage={capturedImage}
            onClearCapturedImage={() => setCapturedImage(null)}
            showMediaOptions={showMediaOptions}
            onOpenMediaOptions={handleOpenMediaOptions}
            onCloseMediaOptions={handleCloseMediaOptions}
          />
        </Suspense>
      </footer>
      
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            className="CameraOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCameraClose}
          >
            <motion.div
              className="CameraContainer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <video ref={videoRef} autoPlay className="CameraFeed"></video>
              <div className="CameraControls">
                <MdFlipCameraIos className="FlipCameraIcon" onClick={toggleCamera} />
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

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      
      <AnimatePresence>
        {enlargedImage && (
          <motion.div
            className="EnlargedImageOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEnlargedImage}
          >
            <motion.div
              className="EnlargedImageContainer"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={enlargedImage} alt="Enlarged Preview" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
