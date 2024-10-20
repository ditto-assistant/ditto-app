import "./App.css";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  grabStatus,
  syncLocalScriptsWithFirestore,
} from "../control/firebase";
import Divider from "@mui/material/Divider";
import ChatFeed from "../components/ChatFeed";
import SendMessage from "../components/SendMessage";
import StatusBar from "../components/StatusBar";
import { MdSettings } from "react-icons/md";
import { FaEarListen, FaEarDeaf } from "react-icons/fa6";
import HeyDitto from "../ditto/activation/heyDitto";
import { useBalanceContext } from '../App';

export const DittoActivation = new HeyDitto();
DittoActivation.loadModel();

export default function HomeScreen(props) {
  const navigate = useNavigate();
  const balance = useBalanceContext();
  const [bootStatus, setBootStatus] = useState("on");
  const [startAtBottom, setStartAtBottom] = useState(true);
  const [histCount, setCount] = useState(localStorage.getItem("histCount") || 0);
  const [localScripts, setLocalScripts] = useState({
    webApps: [],
    openSCAD: [],
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
  }
    , [localStorage.getItem("latestWorkingOnScript")]);

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

  };


  // check for localStorage memoryWipe being set to true and reset cound and create new conversation
  useEffect(() => {
    if (localStorage.getItem("resetMemory") === "true") {
      localStorage.setItem("resetMemory", "false");
      setCount(0);
      createConversation({ prompts: [], responses: [] }, true);
    }
  }, [localStorage.getItem("resetMemory")]);



  const handleSettingsClick = () => {
    navigate("/settings");
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
  }, [conversation, histCount]);

  const statusColor = bootStatus === "on" ? "green" : "red";

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
        <h2 className="App-title">Ditto</h2>
        <MdSettings
          style={{
            paddingRight: 20,
            width: buttonSize + 6,
            height: buttonSize + 6,
            color: "white",
            cursor: "pointer",
          }}
          onClick={async () => {
            handleSettingsClick()
          }}
        />
      </header>
      <Divider />
      <StatusBar status={bootStatus} statusColor={statusColor} balance={balance.balance} />
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
