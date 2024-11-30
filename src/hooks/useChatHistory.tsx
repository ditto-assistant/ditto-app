import { useState, useEffect, useContext, createContext } from "react";
import { loadConversationHistoryFromFirestore } from "../control/firebase";

type Message = {
    sender: "User" | "Ditto";
    text: string;
    timestamp: number;
    pairID?: string;
};

type Conversation = {
    messages: Message[];
    is_typing: boolean;
};

type ChatHistory = {
    conversation: Conversation;
    histCount: number;
    updateConversation: (updateFn: (prevState: Conversation) => Conversation) => void;
    startAtBottom: boolean;
};

const ChatHistoryContext = createContext<ChatHistory | undefined>(undefined);

export function useChatHistory() {
    const context = useContext(ChatHistoryContext);
    if (!context) {
        throw new Error("useChatHistory must be used within a ChatHistoryProvider");
    }
    return context;
}

const loadConversationFromLocalStorage = (): Conversation => {
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

const getSavedConversation = () => {
    const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
    const responses = JSON.parse(localStorage.getItem("responses") || "[]");
    const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");
    const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");
    return { prompts, responses, timestamps, pairIDs };
};

const createConversation = (hist: any, reset: boolean, onload?: boolean): Conversation => {
    try {
        let newConversation: Conversation = {
            messages: [
                { sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() },
            ],
            is_typing: false,
        };

        if (reset) {
            return newConversation;
        }

        const prompts = hist.prompts || [];
        const responses = hist.responses || [];
        const timestamps = hist.timestamps || [];
        const pairIDs = hist.pairIDs || [];

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

        return newConversation;
    } catch (e) {
        console.log(e);
        return {
            messages: [
                { sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() },
            ],
            is_typing: false,
        };
    }
};

export function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
    const [conversation, setConversation] = useState<Conversation>(loadConversationFromLocalStorage);
    const [histCount, setHistCount] = useState<number>(parseInt(localStorage.getItem("histCount") || "0"));
    const [startAtBottom, setStartAtBottom] = useState(true);

    const updateConversation = (updateFn: (prevState: Conversation) => Conversation) => {
        setConversation((prevState) => {
            const newState = updateFn(prevState);
            localStorage.setItem("conversation", JSON.stringify(newState));
            return newState;
        });
    };

    const checkAndResyncPairIDs = () => {
        const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
        const responses = JSON.parse(localStorage.getItem("responses") || "[]");
        const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");
        const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");

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

            const userID = localStorage.getItem("userID");
            if (userID) {
                console.log("Resyncing conversation history from Firestore...");
                loadConversationHistoryFromFirestore(userID)
                    .then((conversationHistory) => {
                        if (conversationHistory) {
                            localStorage.setItem("prompts", JSON.stringify(conversationHistory.prompts));
                            localStorage.setItem("responses", JSON.stringify(conversationHistory.responses));
                            localStorage.setItem("timestamps", JSON.stringify(conversationHistory.timestamps));
                            localStorage.setItem("pairIDs", JSON.stringify(conversationHistory.pairIDs));
                            localStorage.setItem("histCount", String(conversationHistory.prompts.length));

                            console.log("Successfully resynced conversation history");
                            console.log(`New lengths - prompts: ${conversationHistory.prompts.length}, pairIDs: ${conversationHistory.pairIDs.length}`);

                            const newConversation = createConversation(conversationHistory, false, true);
                            setConversation(newConversation);
                        }
                    })
                    .catch((error) => {
                        console.error("Error resyncing conversation history:", error);
                    });
            }
        }
    };

    const syncConversationHist = () => {
        const localHistCount = parseInt(localStorage.getItem("histCount") || "0");
        const thinkingObjectString = localStorage.getItem("thinking");

        if (thinkingObjectString !== null && !conversation.is_typing) {
            const thinkingObject = JSON.parse(thinkingObjectString);
            const usersPrompt = thinkingObject.prompt;

            setConversation((prevState) => {
                const newMessages: Message[] = [
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
            setHistCount(localHistCount);
            const localHist = getSavedConversation();
            const newConversation = createConversation(localHist, false);
            setConversation(newConversation);
            setStartAtBottom(false);
        }

        if (isNaN(localHistCount)) {
            setHistCount(0);
        }
    };

    useEffect(() => {
        checkAndResyncPairIDs();

        const syncInterval = setInterval(() => {
            try {
                syncConversationHist();
            } catch (e) {
                console.log(e);
            }
        }, 500);

        return () => clearInterval(syncInterval);
    }, [conversation]);

    useEffect(() => {
        const handleMemoryDeleted = (event: CustomEvent<{ newHistCount: number }>) => {
            const { newHistCount } = event.detail;
            setHistCount(newHistCount);

            const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
            const responses = JSON.parse(localStorage.getItem("responses") || "[]");
            const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");
            const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");

            const newConversation = {
                messages: [
                    { sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() },
                ],
                is_typing: false,
            } as Conversation;

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

            setConversation(newConversation);
        };

        window.addEventListener("memoryDeleted", handleMemoryDeleted as EventListener);

        return () => {
            window.removeEventListener("memoryDeleted", handleMemoryDeleted as EventListener);
        };
    }, []);

    useEffect(() => {
        if (localStorage.getItem("resetMemory") === "true") {
            localStorage.setItem("resetMemory", "false");
            setHistCount(0);
            setConversation(createConversation({ prompts: [], responses: [], timestamps: [], pairIDs: [] }, true));
        }
    }, [localStorage.getItem("resetMemory")]);

    return (
        <ChatHistoryContext.Provider value={{ conversation, histCount, updateConversation, startAtBottom }}>
            {children}
        </ChatHistoryContext.Provider>
    );
}
