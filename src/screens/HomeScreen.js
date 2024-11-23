import "./HomeScreen.css";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { grabStatus, syncLocalScriptsWithFirestore } from "../control/firebase";
import FullScreenSpinner from "../components/LoadingSpinner";
import { useBalance } from "@/hooks/useBalance";
import { useDittoActivation } from "@/hooks/useDittoActivation";
import { loadConversationHistoryFromFirestore } from "../control/firebase";
import TermsOfService from "../components/TermsOfService";
// Lazy load components
const ChatFeed = lazy(() => import("@/components/ChatFeed"));
const SendMessage = lazy(() => import("@/components/SendMessage"));
const StatusBar = lazy(() => import("@/components/StatusBar"));
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import dittoIcon from "/icons/ditto-icon-clear2.png";
import { IoSettingsOutline } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { MdFlipCameraIos } from "react-icons/md";
import MiniFocusOverlay from "../components/MiniFocusOverlay";
import ScriptActionsOverlay from "../components/ScriptActionsOverlay";
import {
  deleteScriptFromFirestore,
  renameScriptInFirestore,
  getVersionsOfScriptFromFirestore,
  getScriptTimestamps,
  saveScriptToFirestore,
} from "../control/firebase";
import MemoryOverlay from "../components/MemoryOverlay";

const MEMORY_DELETED_EVENT = "memoryDeleted"; // Add this line

export default function HomeScreen() {
  const navigate = useNavigate();
  const balance = useBalance();
  const [bootStatus, setBootStatus] = useState("on");
  const [startAtBottom, setStartAtBottom] = useState(true);
  const [histCount, setCount] = useState(
    localStorage.getItem("histCount") || 0
  );
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

  const loadConversationFromLocalStorage = () => {
    const savedConversation = localStorage.getItem("conversation");
    return savedConversation
      ? JSON.parse(savedConversation)
      : {
        messages: [
          { sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() },
        ],
        is_typing: false,
      };
  };

  const [conversation, setConversation] = useState(
    loadConversationFromLocalStorage
  );

  const updateConversation = (updateFn) => {
    setConversation((prevState) => {
      const newState = updateFn(prevState);
      localStorage.setItem("conversation", JSON.stringify(newState));
      return newState;
    });
  };

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

  // check for localStorage item latestWorkingOnScript which contains JSON of script and scriptName and navigate to canvas with that script
  // canvas takes the script and scriptName as props
  useEffect(() => {
    const latestWorkingOnScript = localStorage.getItem("latestWorkingOnScript");
    if (latestWorkingOnScript) {
      const { script, scriptName } = JSON.parse(latestWorkingOnScript);
      localStorage.removeItem("latestWorkingOnScript");
      navigate("/canvas", { state: { script, scriptName } });
    }
  }, [localStorage.getItem("latestWorkingOnScript")]);

  const createConversation = (hist, reset, onload) => {
    try {
      let newConversation = {
        messages: [
          { sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() },
        ],
        is_typing: false,
      };
      if (reset) {
        setConversation(newConversation);
        return;
      }
      let prompts = hist.prompts || [];
      let responses = hist.responses || [];
      let timestamps = hist.timestamps || [];
      let pairIDs = hist.pairIDs || [];

      for (let i = 0; i < prompts.length; i++) {
        let prompt = prompts[i];
        let response = responses[i];
        let timestamp = timestamps[i];
        let pairID = pairIDs[i];

        newConversation.messages.push({
          sender: "User",
          text: prompt,
          timestamp: timestamp,
          pairID: pairID,
        });
        newConversation.messages.push({
          sender: "Ditto",
          text: response,
          timestamp: timestamp,
          pairID: pairID,
        });
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
    let pairIDs = JSON.parse(localStorage.getItem("pairIDs"));
    return { prompts, responses, timestamps, pairIDs };
  };

  let convo = getSavedConversation();
  let previousConversation = createConversation(convo, false, true);

  const localStorageMicrophoneStatus =
    localStorage.getItem("microphoneStatus") === "true";
  const [microphoneStatus, setMicrophoneStatus] = useState(
    localStorageMicrophoneStatus
  );

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
  }

  const appBodyRef = useRef(null);

  // check for localStorage memoryWipe being set to true and reset cound and create new conversation
  useEffect(() => {
    if (localStorage.getItem("resetMemory") === "true") {
      localStorage.setItem("resetMemory", "false");
      setCount(0);
      createConversation(
        { prompts: [], responses: [], timestamps: [], pairIDs: [] },
        true
      );
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

  // Add this function after getSavedConversation
  const checkAndResyncPairIDs = () => {
    const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
    const responses = JSON.parse(localStorage.getItem("responses") || "[]");
    const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");
    const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");

    // Check if arrays exist and have matching lengths
    if (
      prompts.length !== responses.length ||
      prompts.length !== timestamps.length ||
      prompts.length !== pairIDs.length
    ) {
      console.log("Detected mismatch in localStorage arrays:");
      console.log(`prompts: ${prompts.length}`);
      console.log(`responses: ${responses.length}`);
      console.log(`timestamps: ${timestamps.length}`);
      console.log(`pairIDs: ${pairIDs.length}`);

      // Load conversation history from Firestore to resync
      const userID = localStorage.getItem("userID");
      if (userID) {
        console.log("Resyncing conversation history from Firestore...");
        loadConversationHistoryFromFirestore(userID)
          .then((conversationHistory) => {
            if (conversationHistory) {
              localStorage.setItem(
                "prompts",
                JSON.stringify(conversationHistory.prompts)
              );
              localStorage.setItem(
                "responses",
                JSON.stringify(conversationHistory.responses)
              );
              localStorage.setItem(
                "timestamps",
                JSON.stringify(conversationHistory.timestamps)
              );
              localStorage.setItem(
                "pairIDs",
                JSON.stringify(conversationHistory.pairIDs)
              );
              localStorage.setItem(
                "histCount",
                conversationHistory.prompts.length
              );
              console.log("Successfully resynced conversation history");
              console.log(
                `New lengths - prompts: ${conversationHistory.prompts.length}, pairIDs: ${conversationHistory.pairIDs.length}`
              );

              // Update the conversation state
              const newConversation = createConversation(
                conversationHistory,
                false,
                true
              );
              setConversation(newConversation);
            }
          })
          .catch((error) => {
            console.error("Error resyncing conversation history:", error);
          });
      }
    }
  };

  // Add this to your existing useEffect that runs on mount
  useEffect(() => {
    syncScripts();
    balance.refetch();
    checkAndResyncPairIDs(); // Add this line

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
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
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
    // Update the existing useEffect that handles viewport height
    const setVH = () => {
      // First get the viewport height and multiply it by 1% to get a value for a vh unit
      const vh = window.innerHeight * 0.01;
      // Then set the value in the --vh custom property to the root of the document
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    // Initial set
    setVH();

    // Add event listeners
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    // For Chrome mobile, handle toolbar show/hide
    let lastHeight = window.innerHeight;
    window.addEventListener("scroll", () => {
      if (window.innerHeight !== lastHeight) {
        lastHeight = window.innerHeight;
        setVH();
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
      window.removeEventListener("scroll", setVH);
    };
  }, []);

  const toggleStatusBar = () => {
    setShowStatusBar((prev) => !prev);
  };

  /**
   * Enlarges an image to a full screen view
   * @param {string} imageUrl - The URL of the image to enlarge
   */
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

  const handleTOSClose = () => {
    localStorage.setItem("hasSeenTOS", "true");
    setShowTOS(false);
  };

  // Functions for play, edit, and deselect actions
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

  const handleEditScript = (script) => {
    // If script is passed directly, use it, otherwise try to find the selected script
    const scriptToEdit =
      script ||
      (selectedScript &&
        (scripts.webApps.find((s) => s.name === selectedScript) ||
          scripts.openSCAD.find((s) => s.name === selectedScript)));

    if (scriptToEdit) {
      if (scriptToEdit.scriptType === "webApps") {
        setFullScreenEdit({
          ...scriptToEdit,
          onSaveCallback: async (newContent) => {
            const userID = localStorage.getItem("userID");
            try {
              setShowLoadingSpinner(true);
              await saveScriptToFirestore(
                userID,
                newContent,
                scriptToEdit.scriptType,
                scriptToEdit.name
              );

              // Update local scripts
              await syncLocalScriptsWithFirestore(
                userID,
                scriptToEdit.scriptType
              );

              // Update workingOnScript in localStorage
              const workingOnScript = {
                script: scriptToEdit.name,
                contents: newContent,
                scriptType: scriptToEdit.scriptType,
              };
              localStorage.setItem(
                "workingOnScript",
                JSON.stringify(workingOnScript)
              );

              setShowLoadingSpinner(false);
              setFullScreenEdit(null);
            } catch (error) {
              console.error("Error saving:", error);
              setShowLoadingSpinner(false);
            }
          },
        });
      } else {
        setOpenScadViewer(scriptToEdit);
      }
    }
  };

  const handleDeselectScript = () => {
    localStorage.removeItem("workingOnScript");
    setWorkingScript(null);
  };

  const [showScriptActions, setShowScriptActions] = useState(false);

  const handleScriptNameClick = () => {
    setShowScriptActions(true);
  };

  const [scriptVersions, setScriptVersions] = useState([]);

  useEffect(() => {
    const loadScriptVersions = async () => {
      if (workingScript) {
        const storedScript = JSON.parse(
          localStorage.getItem("workingOnScript")
        );
        if (storedScript) {
          const userID = localStorage.getItem("userID");
          const versions = await getVersionsOfScriptFromFirestore(
            userID,
            storedScript.scriptType,
            storedScript.script
          );
          setScriptVersions(versions);
        }
      }
    };

    loadScriptVersions();
  }, [workingScript]);

  const handleScriptDelete = async (isDeleteAll) => {
    const userID = localStorage.getItem("userID");
    const storedScript = JSON.parse(localStorage.getItem("workingOnScript"));

    if (storedScript) {
      if (isDeleteAll) {
        // Delete base version and all versioned copies
        const baseScriptName = storedScript.script.split("-v")[0];
        const versions = await getVersionsOfScriptFromFirestore(
          userID,
          storedScript.scriptType,
          baseScriptName
        );

        // Delete each version
        for (const version of versions) {
          const versionName =
            version.versionNumber === 0
              ? baseScriptName
              : `${baseScriptName}-v${version.versionNumber}`;
          await deleteScriptFromFirestore(
            userID,
            storedScript.scriptType,
            versionName
          );
        }
      } else {
        // Delete just the current version
        await deleteScriptFromFirestore(
          userID,
          storedScript.scriptType,
          storedScript.script
        );
      }

      // Update local storage and state
      handleDeselectScript();

      // Refresh timestamps
      await getScriptTimestamps(userID, storedScript.scriptType);

      // Dispatch event to refresh scripts list
      window.dispatchEvent(new Event("scriptsUpdated"));
    }
  };

  const handleScriptRename = async (newName) => {
    const userID = localStorage.getItem("userID");
    const storedScript = JSON.parse(localStorage.getItem("workingOnScript"));

    if (storedScript) {
      await renameScriptInFirestore(
        userID,
        storedScript.timestampString,
        storedScript.scriptType,
        storedScript.script,
        newName
      );

      // Update local storage
      const updatedScript = {
        ...storedScript,
        script: newName,
      };
      localStorage.setItem("workingOnScript", JSON.stringify(updatedScript));

      // Update state
      setWorkingScript(newName);

      // Refresh timestamps
      await getScriptTimestamps(userID, storedScript.scriptType);

      // Dispatch event to refresh scripts list
      window.dispatchEvent(new Event("scriptsUpdated"));
    }
  };

  const handleVersionSelect = async (version) => {
    const userID = localStorage.getItem("userID");
    const storedScript = JSON.parse(localStorage.getItem("workingOnScript"));

    if (storedScript && version) {
      const baseScriptName = storedScript.script.split("-v")[0];
      const versionName =
        version.versionNumber === 0
          ? baseScriptName
          : `${baseScriptName}-v${version.versionNumber}`;

      // Update working script to selected version
      const updatedScript = {
        ...storedScript,
        script: versionName,
        contents: version.script,
      };
      localStorage.setItem("workingOnScript", JSON.stringify(updatedScript));

      // Update state
      setWorkingScript(versionName);

      // Refresh timestamps
      await getScriptTimestamps(userID, storedScript.scriptType);

      // Dispatch event to refresh scripts list
      window.dispatchEvent(new Event("scriptsUpdated"));
    }
  };

  const handleRevert = async () => {
    const userID = localStorage.getItem("userID");
    const storedScript = JSON.parse(localStorage.getItem("workingOnScript"));

    if (storedScript) {
      const baseScriptName = storedScript.script.split("-v")[0];
      const versions = await getVersionsOfScriptFromFirestore(
        userID,
        storedScript.scriptType,
        baseScriptName
      );

      if (versions.length > 1) {
        // Get the highest version number
        const latestVersion = versions.reduce(
          (max, version) => Math.max(max, version.versionNumber),
          0
        );

        // Select that version
        const version = versions.find((v) => v.versionNumber === latestVersion);
        await handleVersionSelect(version);
      }
    }
  };

  const [statusBarLoaded, setStatusBarLoaded] = useState(false);

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
            onOverlayTrigger={handleScriptNameClick}
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
            onAnimationComplete={() => setStatusBarLoaded(true)}
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
          <AnimatePresence>
            {(!showStatusBar || statusBarLoaded) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Suspense
                  fallback={
                    <div className="loading-placeholder">Loading chat...</div>
                  }
                >
                  <ChatFeed
                    messages={conversation.messages}
                    showSenderName={false}
                    histCount={histCount}
                    isTyping={conversation.is_typing}
                    scrollToBottom={true}
                    startAtBottom={startAtBottom}
                    updateConversation={updateConversation}
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
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
            updateConversation={updateConversation}
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

      {showTOS && (
        <TermsOfService
          onClose={() => setShowTOS(false)}
          isNewAccount={true} // Always show Accept/Decline for users who haven't accepted TOS
        />
      )}

      <AnimatePresence>
        {showScriptActions && workingScript && (
          <ScriptActionsOverlay
            scriptName={workingScript}
            script={{
              name: workingScript,
              content: (() => {
                const stored = localStorage.getItem("workingOnScript");
                if (!stored) return "";
                try {
                  const parsed = JSON.parse(stored);
                  return parsed.contents || "";
                } catch (e) {
                  console.error("Error parsing script contents:", e);
                  return "";
                }
              })(),
              scriptType: (() => {
                const stored = localStorage.getItem("workingOnScript");
                if (!stored) return "";
                try {
                  const parsed = JSON.parse(stored);
                  return parsed.scriptType || "";
                } catch (e) {
                  console.error("Error parsing script type:", e);
                  return "";
                }
              })(),
            }}
            onPlay={handlePlayScript}
            onEdit={async (updatedContent) => {
              const storedScript = localStorage.getItem("workingOnScript");
              if (!storedScript) return;

              try {
                const parsed = JSON.parse(storedScript);
                const userID = localStorage.getItem("userID");
                await saveScriptToFirestore(
                  userID,
                  updatedContent,
                  parsed.scriptType,
                  parsed.script
                );
                // Update the stored script content
                localStorage.setItem(
                  "workingOnScript",
                  JSON.stringify({
                    ...parsed,
                    contents: updatedContent,
                  })
                );
              } catch (e) {
                console.error("Error updating script:", e);
              }
            }}
            onDeselect={handleDeselectScript}
            onClose={() => setShowScriptActions(false)}
          />
        )}
      </AnimatePresence>

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
