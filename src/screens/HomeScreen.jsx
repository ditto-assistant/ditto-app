import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { grabStatus } from "@/control/firebase";
import FullScreenSpinner from "@/components/LoadingSpinner";
import { useBalance } from "@/hooks/useBalance";
import { loadConversationHistoryFromFirestore } from "@/control/firebase";
import TermsOfService from "@/components/TermsOfService";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import dittoIcon from "/icons/ditto-icon-clear.png";
import { IoSettingsOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { MdFlipCameraIos, MdFeedback } from "react-icons/md";
import MiniFocusOverlay from "@/components/MiniFocusOverlay";
import ScriptActionsOverlay from "@/components/ScriptActionsOverlay";
import ChatFeed from "@/components/ChatFeed";
import StatusBar from "@/components/StatusBar";
import SendMessage from "@/components/SendMessage";
import FullScreenEditor from "@/screens/Editor/FullScreenEditor";
import { useModal } from "@/hooks/useModal";
import { useAuth } from "@/hooks/useAuth";
import { useScripts } from "@/hooks/useScripts.tsx";
import { usePlatform } from "@/hooks/usePlatform";
import "@/styles/buttons.css";
import "./HomeScreen.css";
const MEMORY_DELETED_EVENT = "memoryDeleted";

export default function HomeScreen() {
  const balance = useBalance();
  const [bootStatus, setBootStatus] = useState("on");
  const [startAtBottom, setStartAtBottom] = useState(true);
  const [histCount, setCount] = useState(
    localStorage.getItem("histCount") || 0
  );
  const [showStatusBar, setShowStatusBar] = useState(true);
  const { user } = useAuth();
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
  const modal = useModal();
  const openSettingsModal = modal.createOpenHandler("settings");
  const openFeedbackModal = modal.createOpenHandler("feedback");
  const openDittoCanvas = modal.createOpenHandler("dittoCanvas");
  const openMemoryOverlay = modal.createOpenHandler("memorySettings");
  const openScriptsOverlay = modal.createOpenHandler("scripts");
  const { isIOS } = usePlatform();
  const {
    selectedScript,
    setSelectedScript,
    handleDeselectScript,
    saveScript,
  } = useScripts();

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

  const updateConversation = useCallback((updateFn) => {
    setConversation((prevState) => {
      const newState = updateFn(prevState);
      localStorage.setItem("conversation", JSON.stringify(newState));
      return newState;
    });
  }, []);

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

  const appBodyRef = useRef(null);

  useEffect(() => {
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

        if (user?.uid) {
          console.log("Resyncing conversation history from Firestore...");
          loadConversationHistoryFromFirestore(user?.uid)
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
    checkAndResyncPairIDs();

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
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [conversation, bootStatus, histCount, user?.uid]);

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
      let vh = window.innerHeight * 0.01;

      // For iOS Safari, use the visualViewport API for more accurate measurements
      if (isIOS && window.visualViewport) {
        vh = window.visualViewport.height * 0.01;
      }

      // Then set the value in the --vh custom property to the root of the document
      document.documentElement.style.setProperty("--vh", `${vh}px`);

      // Also set a specific iOS viewport height value
      if (isIOS) {
        const iosVh = (window.innerHeight + 80) * 0.01; // Add extra space for the footer
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
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1.0, user-scalable=no"
        );
      }

      // Add iOS class to root element only

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
  }, [isIOS]);

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
    setShowScriptActions(true);
  };

  const [statusBarLoaded, setStatusBarLoaded] = useState(false);

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
      handleCloseFullScreenEditor
    );
    return () => {
      window.removeEventListener(
        "closeFullScreenEditor",
        handleCloseFullScreenEditor
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

  return (
    <div className="app" onClick={handleCloseMediaOptions}>
      <header className="app-header">
        <motion.div
          className="ditto-icon-button"
          whileTap={{ scale: 0.9 }}
          whileHover={{
            scale: 1.1,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          }}
          onClick={openFeedbackModal}
          onKeyDown={(e) => handleKeyDown(e, openFeedbackModal)}
          aria-label="Feedback"
          role="button"
          tabIndex={0}
        >
          <MdFeedback className="icon" />
        </motion.div>

        {selectedScript ? (
          <MiniFocusOverlay
            scriptName={selectedScript.script}
            onPlay={handlePlayScript}
            onDeselect={handleDeselectScript}
            onOverlayTrigger={handleScriptNameClick}
          />
        ) : (
          <motion.div
            className="app-title-container"
            onClick={toggleStatusBar}
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            <img src={dittoIcon} alt="Ditto Icon" className="ditto-icon" />
            <h1 className="app-title">Hey Ditto</h1>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              {showStatusBar ? <IoMdArrowDropup /> : <IoMdArrowDropdown />}
            </motion.div>
          </motion.div>
        )}

        <motion.div
          className="ditto-icon-button"
          whileTap={{ scale: 0.9 }}
          whileHover={{
            scale: 1.1,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          }}
          onClick={openSettingsModal}
          onKeyDown={(e) => handleKeyDown(e, openSettingsModal)}
          aria-label="Settings"
          role="button"
          tabIndex={0}
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
              <StatusBar
                onMemoryClick={openMemoryOverlay}
                onScriptsClick={openScriptsOverlay}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="app-body"
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
      <footer className="app-footer">
        <Suspense fallback={<FullScreenSpinner />}>
          <SendMessage
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

      <AnimatePresence>
        {showScriptActions && selectedScript && (
          <ScriptActionsOverlay
            scriptName={selectedScript.script}
            script={{
              name: selectedScript.script,
              content: selectedScript.contents,
              scriptType: selectedScript.scriptType,
            }}
            onPlay={handlePlayScript}
            onEdit={async (updatedContent) => {
              try {
                // Use the scripts manager to update the script
                await saveScript(
                  updatedContent,
                  selectedScript.scriptType,
                  selectedScript.script
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
