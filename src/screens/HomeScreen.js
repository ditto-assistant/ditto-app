import "./App.css";
import React, { useState, useEffect, useRef } from "react";
import {
  grabStatus,
  resetConversation,
  getBalanceFromFirestore,
  saveBalanceToFirestore,
  syncLocalScriptsWithFirestore,
  loadConversationHistoryFromFirestore
} from "../control/firebase";
import Divider from "@mui/material/Divider";
import ChatFeed from "../components/ChatFeed";
import SendMessage from "../components/SendMessage";
import StatusBar from "../components/StatusBar";
import { FaUndo } from "react-icons/fa";
import { FaEarListen, FaEarDeaf } from "react-icons/fa6";

// import heyDitto
import HeyDitto from "../ditto/activation/heyDitto";

// import delete all images from firebase
import { deleteAllUserImagesFromFirebaseStorageBucket } from "../control/firebase";

export const DittoActivation = new HeyDitto();
DittoActivation.loadModel();



export default function HomeScreen() {

  const [bootStatus, setBootStatus] = useState("on");
  const [startAtBottom, setStartAtBottom] = useState(true);
  const [histCount, setCount] = useState(localStorage.getItem("histCount") || 0);
  const [localScripts, setLocalScripts] = useState({
    webApps: [],
    openSCAD: [],
  });

  const createConversation = (hist, reset, onload) => {
    try {
      let newConversation = {
        messages: [{ sender: "Ditto", text: "Hi! I'm Ditto." }],
        is_typing: false,
      };
      if (reset) {
        setConversation(newConversation);
        return;
      }
      let prompts = hist.prompts || [];
      let responses = hist.responses || [];
      for (let i = 0; i < prompts.length; i++) {
        let prompt = prompts[i];
        let response = responses[i];
        newConversation.messages.push({ sender: "User", text: prompt });
        newConversation.messages.push({ sender: "Ditto", text: response });
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
    return { prompts, responses };
  };

  let convo = getSavedConversation();
  let previousConversation = createConversation(convo, false, true)
  const [conversation, setConversation] = useState(previousConversation);
  
  const localStorageMicrophoneStatus = localStorage.getItem("microphoneStatus") === "true";
  const [microphoneStatus, setMicrophoneStatus] = useState(localStorageMicrophoneStatus);
  const [loading, setLoading] = useState(true);

  let buttonSize = 25;

  const handleMicPress = async () => {
    console.log("handling mic press...");
    // set value in localStorage
    localStorage.setItem("microphoneStatus", !microphoneStatus);
    setMicrophoneStatus((prevStatus) => !prevStatus);
    // if mic status is false stop listening for name
    if (microphoneStatus) {
      DittoActivation.stopListening();
    } else {
      DittoActivation.startListening();
    }
  };

  const appBodyRef = useRef(null); // Reference to App-body

  const sendMessage = async (message) => {
    // Simulate sending message
    setConversation(prevState => ({
      ...prevState,
      messages: [...prevState.messages, { sender: "User", text: message }],
      is_typing: true,
    }));

    // Simulate delayed response from Ditto
    setTimeout(() => {
      setConversation(prevState => ({
        ...prevState,
        messages: [...prevState.messages, { sender: "Ditto", text: "Response from Ditto" }],
        is_typing: false,
      }));
    }, 1000);
  };

  const resetConversationHandler = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to delete all memory? This action cannot be undone."
    );
    if (confirmReset) {
      console.log("Resetting conversation history...");
      const userID = localStorage.getItem("userID");
      localStorage.removeItem("prompts");
      localStorage.removeItem("responses");
      localStorage.removeItem("histCount");
      setCount(0);
      createConversation({ prompts: [], responses: [] }, true);
      await resetConversation(userID);
      await deleteAllUserImagesFromFirebaseStorageBucket(userID);
    }
  };


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
      } finally {
        setLoading(false);
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
          { sender: "User", text: usersPrompt },
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


  const syncBalance = async () => {
    let userID = localStorage.getItem("userID");
    // update local storage with balance from firestore
    getBalanceFromFirestore(userID).then((balance) => {
      if (balance) {
        localStorage.setItem(`${userID}_balance`, balance);
      } else {
        localStorage.setItem(`${userID}_balance`, 0);
      }
    });
  };

  useEffect(() => {
    syncScripts();
    syncBalance();
  }, []);

  useEffect(() => {
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
  }, [conversation, histCount]);

  const statusColor = bootStatus === "on" ? "green" : "red";

  // New useEffect to handle keyboard
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

  if (loading) {
  //   return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        {microphoneStatus === true ? (
          <FaEarListen
            style={{
              paddingLeft: 20,
              color: "green",
              width: buttonSize,
              height: buttonSize,
            }}
            onClick={async () => {
              await handleMicPress();
            }}
          />
        ) : (
          <FaEarDeaf
            style={{
              paddingLeft: 20,
              color: "red",
              width: buttonSize,
              height: buttonSize,
            }}
            onClick={async () => {
              await handleMicPress();
            }}
          />
        )}
        <h2>Ditto Dashboard</h2>
        <FaUndo
          style={{
            paddingRight: 20,
            width: buttonSize,
            height: buttonSize,
            color: "white",
          }}
          onClick={async () => {
            await resetConversationHandler();
          }}
        />
      </header>
      <Divider />
      <StatusBar status={bootStatus} statusColor={statusColor} />
      <Divider />
      <div className="App-body" ref={appBodyRef}>
        <div className="chat-container">
          <ChatFeed
            messages={conversation.messages}
            histCount={histCount}
            isTyping={conversation.is_typing}
            scrollToBottom={true}
            startAtBottom={startAtBottom}
          /> {/* Passing isTyping and scrollToBottom prop */}
        </div>
      </div>

      <footer className="App-footer">
        <SendMessage sendMessage={sendMessage} />
      </footer>
    </div>
  );
}