import React, { useState, useEffect, useRef } from "react";
import { FaUndo, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import Divider from '@mui/material/Divider';

import "./App.css";
import {
    grabConversationHistory,
    grabConversationHistoryCount,
    grabStatus,
    resetConversation,
    grabMicStatus,
    toggleMic
} from "../models/api";
import { ChatFeed, Message } from "../modules/react-chat-ui-omar-fork/lib";
import ChatBubbles from "../components/ChatBubbles";
import SendMessage from "../components/SendMessage";
import StatusBar from "../components/StatusBar";

const HomeScreen = () => {
    const [bootStatus, setBootStatus] = useState("off");
    const [histCount, setCount] = useState(0);
    const [reset, setReset] = useState(false);
    const [microphoneStatus, setMicrophoneStatus] = useState("off");
    const [conversation, setConversation] = useState({
        messages: [
            new Message({
                id: 1,
                message: "Hi! I'm Ditto.",
            }),
        ],
    });

    const bottomRef = useRef(null);

    const buttonSize = 25;
    const statusColor = bootStatus === "on" ? "green" : "red";

    const handleMicPress = async () => {
        await toggleMic();
        setMicrophoneStatus(!microphoneStatus);
    };

    const resetConversationHandler = async () => {
        await resetConversation();
        setReset(true);
    };

    const getSavedConversation = () => {
        const prompts = JSON.parse(window.electron.store.get('prompts'));
        const responses = JSON.parse(window.electron.store.get('responses'));
        return { prompts, responses };
    };

    const handleSaveConversation = (hist) => {
        window.electron.store.set('prompts', JSON.stringify(hist.prompts));
        window.electron.store.set('responses', JSON.stringify(hist.responses));
    };

    const createConversation = async (hist, save) => {
        if (save) handleSaveConversation(hist);
        let newConversation = {
            messages: [
                new Message({
                    id: 1,
                    message: "Hi! I'm Ditto.",
                }),
            ],
        };
        if (reset) {
            setCount(0);
            setConversation(newConversation);
            setReset(false);
            return;
        }
        for (var key in hist.prompts) {
            let prompt = hist.prompts[key][0];
            let response = hist.responses[key][0];
            newConversation.messages.push(
                new Message({
                    id: 0,
                    message: prompt,
                }),
                new Message({
                    id: 1,
                    message: response,
                })
            );
        }
        setConversation(newConversation);
    };

    useEffect(() => {
        const syncData = async () => {
            try {
                const [statusDb, micStatusDb, serverHistCount] = await Promise.all([
                    grabStatus(),
                    grabMicStatus(),
                    grabConversationHistoryCount(),
                ]);

                if (bootStatus !== statusDb.status) setBootStatus(statusDb.status);
                if (microphoneStatus !== micStatusDb.ditto_mic_status) {
                    setMicrophoneStatus(micStatusDb.ditto_mic_status);
                }

                const localHistCount = window.electron.store.get('histCount');
                if (serverHistCount !== undefined && serverHistCount !== localHistCount) {
                    const hist = await grabConversationHistory();
                    if (histCount !== serverHistCount) setCount(serverHistCount);
                    createConversation(hist, true);
                    window.electron.store.set('histCount', serverHistCount);
                } else if (histCount !== localHistCount) {
                    const localHist = getSavedConversation();
                    setCount(localHistCount);
                    createConversation(localHist, false);
                }
            } catch (e) {
                console.log(e);
            }
        }

        const syncInterval = setInterval(syncData, 1000);
        return () => clearInterval(syncInterval);
    }, [reset, bootStatus, microphoneStatus, histCount]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [histCount]);

    return (
        <div className='App'>
            <header className='App-header'>
                {microphoneStatus === 'on' ? (
                    <FaMicrophone style={{ paddingLeft: 20, color: 'green', width: buttonSize, height: buttonSize }} onClick={handleMicPress} />
                ) :
                    <FaMicrophoneSlash style={{ paddingLeft: 20, color: 'red', width: buttonSize, height: buttonSize }} onClick={handleMicPress} />
                }
                <h2>Ditto Dashboard</h2>
                <FaUndo style={{ paddingRight: 20, width: buttonSize, height: buttonSize, color: 'white' }} onClick={resetConversationHandler} />
            </header>
            <Divider />
            <StatusBar status={bootStatus} statusColor={statusColor} />
            <Divider />
            <div className='App-body'>
                <ChatBubbles conversation={conversation} />
                <div ref={bottomRef} />
            </div>
            <footer className='App-footer'>
                <SendMessage />
            </footer>
        </div>
    );
}

export default HomeScreen;