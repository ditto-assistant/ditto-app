import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { auth, saveFeedback } from "@/control/firebase";
import "./ChatFeed.css";
import { deleteConversation } from "@/control/memory";
import { routes } from "@/firebaseConfig";
import { textEmbed } from "@/api/LLM";
import MemoryNetwork from "@/components/MemoryNetwork";
import { useTokenStreaming } from "@/hooks/useTokenStreaming";
import { processResponse } from "@/control/agent";
import { usePresignedUrls } from "@/hooks/usePresignedUrls";
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { toast } from "react-hot-toast";
import ChatMessage from "@/components/chat/ChatMessage";
import ActionOverlay from "@/components/chat/ActionOverlay";
import ReactionOverlay from "@/components/chat/ReactionOverlay";
import ImageOverlay from "@/components/chat/ImageOverlay";
import DeleteConfirmation from "@/components/chat/DeleteConfirmation";

// Constants moved to the top
const DITTO_AVATAR_KEY = "dittoAvatar";
const USER_AVATAR_KEY = "userAvatar";
const AVATAR_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const AVATAR_FETCH_COOLDOWN = 60 * 1000; // 1 minute cooldown between fetch attempts

// Helper functions
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

const loadMessagesFromLocalStorage = () => {
  try {
    const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
    const responses = JSON.parse(localStorage.getItem("responses") || "[]");
    const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");
    const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");

    const messages = [];
    messages.push({
      sender: "Ditto",
      text: "Hi! I'm Ditto.",
      timestamp: Date.now(),
      pairID: null,
    });

    for (let i = 0; i < prompts.length; i++) {
      messages.push({
        sender: "User",
        text: prompts[i],
        timestamp: timestamps[i],
        pairID: pairIDs[i],
      });
      messages.push({
        sender: "Ditto",
        text: responses[i],
        timestamp: timestamps[i],
        pairID: pairIDs[i],
      });
    }

    return messages;
  } catch (error) {
    console.error("Error loading messages from localStorage:", error);
    return [];
  }
};

const detectToolType = (text) => {
  if (!text) return null;
  if (text.includes("OpenSCAD Script Generated")) return "openscad";
  if (text.includes("HTML Script Generated")) return "html";
  if (text.includes("Image Task:")) return "image";
  if (text.includes("Google Search Query:")) return "search";
  if (text.includes("Home Assistant Task:")) return "home";
  return null;
};

const getAvatarWithCooldown = async (photoURL) => {
  try {
    const now = Date.now();
    const lastFetchAttempt = localStorage.getItem("lastAvatarFetchAttempt");
    const cachedAvatar = localStorage.getItem(USER_AVATAR_KEY);
    const cacheTimestamp = localStorage.getItem("avatarCacheTimestamp");

    if (
      cachedAvatar &&
      cacheTimestamp &&
      now - parseInt(cacheTimestamp) < AVATAR_CACHE_DURATION
    ) {
      return cachedAvatar;
    }

    if (
      lastFetchAttempt &&
      now - parseInt(lastFetchAttempt) < AVATAR_FETCH_COOLDOWN
    ) {
      return cachedAvatar || "/user_placeholder.png";
    }

    localStorage.setItem("lastAvatarFetchAttempt", now.toString());

    const response = await fetch(photoURL, {
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "image/*",
      },
      cache: "force-cache",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch photo: ${response.status}`);
    }

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const base64data = reader.result;
        localStorage.setItem(USER_AVATAR_KEY, base64data);
        localStorage.setItem("avatarCacheTimestamp", now.toString());
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.log("Avatar fetch error:", error.message);
    return localStorage.getItem(USER_AVATAR_KEY) || "/user_placeholder.png";
  }
};

// Main ChatFeed component
const ChatFeed = ({
  messages,
  histCount,
  isTyping = false,
  hasInputField = false,
  showSenderName = false,
  bubblesCentered = false,
  scrollToBottom = false,
  startAtBottom = false,
  updateConversation,
  bubbleStyles = {
    text: {
      fontSize: 14,
    },
    chatbubble: {
      borderRadius: 20,
      padding: 10,
    },
  },
}) => {
  // State
  const [copied, setCopied] = useState(false);
  const [actionOverlay, setActionOverlay] = useState(null);
  const [reactionOverlay, setReactionOverlay] = useState(null);
  const feedRef = useRef(null);
  const bottomRef = useRef(null);
  const [profilePic, setProfilePic] = useState(() => {
    return localStorage.getItem(USER_AVATAR_KEY) || "/user_placeholder.png";
  });
  const [dittoAvatar, setDittoAvatar] = useState(() => {
    return localStorage.getItem(DITTO_AVATAR_KEY) || "/icons/fancy-ditto.png";
  });
  const [reactions, setReactions] = useState({});
  const [imageOverlay, setImageOverlay] = useState(null);
  const [imageControlsVisible, setImageControlsVisible] = useState(true);
  const [memoryOverlay, setMemoryOverlay] = useState(null);
  const [relatedMemories, setRelatedMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [deletingMemories, setDeletingMemories] = useState(new Set());
  const [abortController, setAbortController] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [newMessageAnimation, setNewMessageAnimation] = useState(false);
  const [lastMessageIndex, setLastMessageIndex] = useState(-1);

  // Hooks
  const {
    streamedText,
    currentWord,
    isStreaming,
    processChunk,
    reset,
    isComplete,
  } = useTokenStreaming();
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const { getPresignedUrl, getCachedUrl } = usePresignedUrls();
  const { isDeleting, deleteMemory } = useMemoryDeletion(updateConversation);
  const { preferences } = useModelPreferences();

  // Scroll handling
  const scrollToBottomOfFeed = useCallback((quick = false) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: quick ? "auto" : "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  }, []);

  // Message handlers
  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setActionOverlay(null);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleReaction = useCallback((index, pairID, emoji, feedback) => {
    setReactions((prev) => ({
      ...prev,
      [index]: [...(prev[index] || []), emoji],
    }));
    setReactionOverlay(null);
    setActionOverlay(null);
    if (auth.currentUser) {
      saveFeedback(auth.currentUser.uid, pairID, emoji, feedback);
    }
  }, []);

  const handleBubbleInteraction = useCallback(
    (e, index) => {
      e.preventDefault();
      e.stopPropagation();

      if (window.getSelection().toString() || isSelecting) {
        return;
      }

      if (e.target.classList.contains("chat-image")) {
        return;
      }

      triggerHapticFeedback();

      if (actionOverlay && actionOverlay.index === index) {
        setActionOverlay(null);
        setReactionOverlay(null);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX || rect.left + rect.width / 2;
      const y = e.clientY || rect.top + rect.height / 2;

      setActionOverlay({
        index,
        clientX: x,
        clientY: y,
        type: "text",
      });

      setReactionOverlay(null);
    },
    [actionOverlay, isSelecting]
  );

  const handleImageClick = useCallback(
    (src) => {
      const cachedUrl = getCachedUrl(src);
      setImageOverlay(cachedUrl.ok ?? src);
    },
    [getCachedUrl]
  );

  const handleImageDownload = useCallback((src) => {
    window.open(src, "_blank");
  }, []);

  const handleShowMemories = useCallback(
    async (index) => {
      try {
        const controller = new AbortController();
        setAbortController(controller);
        setLoadingMemories(true);

        const message = messages[index];
        const userID = auth.currentUser.uid;

        let promptToUse;
        let currentPairID;
        let currentTimestamp;
        if (message.sender === "User") {
          promptToUse = message.text;
          currentPairID = message.pairID;
          currentTimestamp = message.timestamp;
        } else {
          if (index > 0 && messages[index - 1].sender === "User") {
            promptToUse = messages[index - 1].text;
            currentPairID = messages[index - 1].pairID;
            currentTimestamp = messages[index - 1].timestamp;
          } else {
            console.error("Could not find corresponding prompt for response");
            setLoadingMemories(false);
            return;
          }
        }

        const embedding = await textEmbed(promptToUse);
        if (!embedding) {
          console.error("Could not generate embedding for prompt");
          setLoadingMemories(false);
          return;
        }

        const token = await auth.currentUser.getIdToken();
        const response = await fetch(routes.memories, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            Origin: window.location.origin,
          },
          body: JSON.stringify({
            userId: userID,
            vector: embedding,
            k: 6,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch memories");
        }

        const data = await response.json();
        let topMemories = data.memories || [];
        topMemories = topMemories.slice(1, 6);

        const memoriesWithRelated = await Promise.all(
          topMemories.map(async (memory) => {
            const relatedEmbedding = await textEmbed(memory.prompt);
            const relatedResponse = await fetch(routes.memories, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                Origin: window.location.origin,
              },
              body: JSON.stringify({
                userId: userID,
                vector: relatedEmbedding,
                k: 3,
              }),
            });

            const relatedData = await relatedResponse.json();
            const relatedMemories = relatedData.memories
              .filter((m) => m.id !== memory.id)
              .slice(0, 2);

            return {
              ...memory,
              related: relatedMemories,
            };
          })
        );

        const networkData = [
          {
            prompt: promptToUse,
            response: message.text,
            timestamp: currentTimestamp,
            timestampString: new Date(currentTimestamp).toISOString(),
            related: memoriesWithRelated.map((mem) => ({
              ...mem,
              timestamp: mem.timestamp,
              timestampString: mem.timestampString,
              related: mem.related.map((rel) => ({
                ...rel,
                timestamp: rel.timestamp,
                timestampString: rel.timestampString,
              })),
            })),
          },
        ];

        setRelatedMemories(networkData);
        setMemoryOverlay({
          index,
          clientX: actionOverlay.clientX,
          clientY: actionOverlay.clientY,
        });
        setActionOverlay(null);
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Memory fetch cancelled");
        } else {
          console.error("Error fetching memories:", error);
        }
      } finally {
        setLoadingMemories(false);
        setAbortController(null);
      }
    },
    [messages, actionOverlay]
  );

  const handleMessageDelete = useCallback(
    async (index) => {
      const message = messages[index];
      const userID = auth.currentUser.uid;
      const pairID = message.pairID;

      if (!pairID) {
        console.error("No pairID found for message:", message);
        return;
      }

      setDeleteConfirmation({
        memory: {
          prompt:
            message.sender === "Ditto" && index > 0
              ? messages[index - 1].text
              : message.text,
          response: message.sender === "Ditto" ? message.text : null,
        },
        idx: index,
        docId: pairID,
        isMessageDelete: true,
      });

      setActionOverlay(null);
    },
    [messages]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmation) return;

    const { memory, idx, docId, isMessageDelete } = deleteConfirmation;
    const userID = auth.currentUser.uid;

    try {
      setIsDeletingMessage(true);

      if (isMessageDelete) {
        setDeletingMemories((prev) => new Set([...prev, idx]));
      }

      const success = await deleteConversation(userID, docId);

      if (success) {
        setDeleteConfirmation(null);

        if (isMessageDelete) {
          updateConversation((prevState) => ({
            ...prevState,
            messages: prevState.messages.filter((msg) => msg.pairID !== docId),
          }));

          const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
          const responses = JSON.parse(
            localStorage.getItem("responses") || "[]"
          );
          const timestamps = JSON.parse(
            localStorage.getItem("timestamps") || "[]"
          );
          const pairIDs = JSON.parse(localStorage.getItem("pairIDs") || "[]");

          const pairIndex = pairIDs.indexOf(docId);
          if (pairIndex !== -1) {
            prompts.splice(pairIndex, 1);
            responses.splice(pairIndex, 1);
            timestamps.splice(pairIndex, 1);
            pairIDs.splice(pairIndex, 1);

            localStorage.setItem("prompts", JSON.stringify(prompts));
            localStorage.setItem("responses", JSON.stringify(responses));
            localStorage.setItem("timestamps", JSON.stringify(timestamps));
            localStorage.setItem("pairIDs", JSON.stringify(pairIDs));
            localStorage.setItem("histCount", pairIDs.length);
          }
        } else {
          const newMemories = relatedMemories.filter((_, i) => i !== idx);
          setRelatedMemories(newMemories);

          if (newMemories.length === 0) {
            setMemoryOverlay(null);
          }
        }
        toast.success("Message deleted successfully");
        window.dispatchEvent(new Event("memoryUpdated"));
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete message");
    } finally {
      setIsDeletingMessage(false);
      setDeletingMemories((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  }, [deleteConfirmation, relatedMemories, updateConversation]);

  const renderMessage = useCallback(
    (message, index) => {
      const isLastMessage = index === messages.length - 1;
      const isLastDittoMessage =
        message.sender === "Ditto" &&
        messages.findIndex((msg, i) => i > index && msg.sender === "Ditto") ===
          -1;

      return (
        <ChatMessage
          key={`${message.pairID}-${index}`}
          message={message}
          index={index}
          isLastMessage={isLastMessage}
          dittoAvatar={dittoAvatar}
          userAvatar={profilePic}
          isLastDittoMessage={isLastDittoMessage}
          onBubbleInteraction={handleBubbleInteraction}
          reactions={reactions}
          actionOverlay={actionOverlay}
          handleCopy={handleCopy}
          bubbleStyles={bubbleStyles}
        />
      );
    },
    [
      messages,
      dittoAvatar,
      profilePic,
      handleBubbleInteraction,
      reactions,
      actionOverlay,
      handleCopy,
      bubbleStyles,
    ]
  );

  // Effects
  useEffect(() => {
    if (messages.length > 0 && (startAtBottom || scrollToBottom)) {
      requestAnimationFrame(() => {
        scrollToBottomOfFeed(true);
      });
    }
  }, [messages, scrollToBottom, startAtBottom, scrollToBottomOfFeed]);

  useEffect(() => {
    const handleStreamUpdate = (event) => {
      const { chunk, isNewMessage } = event.detail;
      if (!chunk) return;

      processChunk(chunk, isNewMessage);

      if (bottomRef.current) {
        const feedElement = feedRef.current;
        const isNearBottom =
          feedElement &&
          feedElement.scrollHeight -
            feedElement.scrollTop -
            feedElement.clientHeight <
            100;

        if (isNearBottom) {
          requestAnimationFrame(() => {
            scrollToBottomOfFeed(true);
          });
        }
      }
    };

    window.addEventListener("responseStreamUpdate", handleStreamUpdate);
    return () => {
      window.removeEventListener("responseStreamUpdate", handleStreamUpdate);
    };
  }, [processChunk, scrollToBottomOfFeed]);

  useEffect(() => {
    if (messages.length > 0 && isStreaming) {
      updateConversation((prevState) => {
        const messages = [...prevState.messages];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage.sender === "Ditto") {
          lastMessage.text = streamedText;
          lastMessage.currentWord = currentWord;
        }

        return { ...prevState, messages };
      });
    }
  }, [
    streamedText,
    currentWord,
    isStreaming,
    messages.length,
    updateConversation,
  ]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (isComplete && streamedText) {
      const toolTriggers = [
        "<OPENSCAD>",
        "<HTML_SCRIPT>",
        "<IMAGE_GENERATION>",
        "<GOOGLE_SEARCH>",
        "<GOOGLE_HOME>",
      ];

      for (const trigger of toolTriggers) {
        if (streamedText.includes(trigger)) {
          processResponse(
            streamedText,
            messages[messages.length - 2].text,
            messages[messages.length - 2].embedding,
            auth.currentUser.uid,
            localStorage.getItem("workingOnScript")
              ? JSON.parse(localStorage.getItem("workingOnScript")).contents
              : "",
            localStorage.getItem("workingOnScript")
              ? JSON.parse(localStorage.getItem("workingOnScript")).script
              : "",
            messages[messages.length - 2].image || "",
            {},
            updateConversation,
            preferences
          );
          return;
        }
      }
    }
  }, [isComplete, streamedText, messages, preferences, updateConversation]);

  // Avatar loading effect
  useEffect(() => {
    fetch("/icons/fancy-ditto.png")
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          localStorage.setItem(DITTO_AVATAR_KEY, base64data);
          setDittoAvatar(base64data);
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => console.error("Error caching Ditto avatar:", error));

    if (auth.currentUser?.photoURL) {
      getAvatarWithCooldown(auth.currentUser.photoURL)
        .then((avatarData) => {
          setProfilePic(avatarData);
        })
        .catch((error) => {
          console.error("Error loading user avatar:", error);
          setProfilePic("/user_placeholder.png");
        });
    } else {
      setProfilePic("/user_placeholder.png");
    }
  }, []);

  // Scroll and overlay handling effects
  useEffect(() => {
    const handleScroll = () => {
      if (actionOverlay || reactionOverlay) {
        setActionOverlay(null);
        setReactionOverlay(null);
      }
    };

    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener("scroll", handleScroll, { passive: true });
      feedElement.addEventListener("wheel", handleScroll, { passive: true });
      feedElement.addEventListener("touchmove", handleScroll, {
        passive: true,
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });

    return () => {
      if (feedElement) {
        feedElement.removeEventListener("scroll", handleScroll);
        feedElement.removeEventListener("wheel", handleScroll);
        feedElement.removeEventListener("touchmove", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, [actionOverlay, reactionOverlay]);

  // Memory cleanup effect
  useEffect(() => {
    if (!actionOverlay && abortController) {
      abortController.abort();
      setAbortController(null);
      setLoadingMemories(false);
    }
  }, [actionOverlay, abortController]);

  return (
    <div className="chat-feed" ref={feedRef} style={{ scrollBehavior: "auto" }}>
      {messages.map(renderMessage)}
      {hasInputField && <input type="text" className="chat-input-field" />}
      {copied && <div className="copied-notification">Copied!</div>}
      <div ref={bottomRef} />

      {actionOverlay && (
        <ActionOverlay
          position={{ x: actionOverlay.clientX, y: actionOverlay.clientY }}
          onCopy={() => handleCopy(messages[actionOverlay.index].text)}
          onReact={() =>
            handleReaction(
              actionOverlay.index,
              messages[actionOverlay.index].pairID,
              "",
              ""
            )
          }
          onShowMemories={() => handleShowMemories(actionOverlay.index)}
          onDelete={() => handleMessageDelete(actionOverlay.index)}
          loadingMemories={loadingMemories}
        />
      )}

      {reactionOverlay && (
        <ReactionOverlay
          position={{ x: reactionOverlay.clientX, y: reactionOverlay.clientY }}
          onReact={(emoji) =>
            handleReaction(
              reactionOverlay.index,
              messages[reactionOverlay.index].pairID,
              emoji,
              ""
            )
          }
        />
      )}

      {imageOverlay && (
        <ImageOverlay
          src={imageOverlay}
          onClose={() => setImageOverlay(null)}
          onDownload={handleImageDownload}
        />
      )}

      {deleteConfirmation && (
        <DeleteConfirmation
          memory={deleteConfirmation.memory}
          docId={deleteConfirmation.docId}
          isDeleting={isDeletingMessage}
          onCancel={() => setDeleteConfirmation(null)}
          onConfirm={confirmDelete}
        />
      )}

      {memoryOverlay && (
        <div className="memory-overlay" onClick={() => setMemoryOverlay(null)}>
          <div className="memory-content" onClick={(e) => e.stopPropagation()}>
            <MemoryNetwork
              memories={relatedMemories}
              onClose={() => setMemoryOverlay(null)}
              onMemoryDeleted={(deletedId) => {
                const userID = auth.currentUser.uid;
                deleteMemory(userID, deletedId);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

ChatFeed.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
      timestamp: PropTypes.number,
      pairID: PropTypes.string,
    })
  ).isRequired,
  histCount: PropTypes.number.isRequired,
  isTyping: PropTypes.bool,
  hasInputField: PropTypes.bool,
  showSenderName: PropTypes.bool,
  bubblesCentered: PropTypes.bool,
  scrollToBottom: PropTypes.bool,
  startAtBottom: PropTypes.bool,
  updateConversation: PropTypes.func.isRequired,
  bubbleStyles: PropTypes.shape({
    text: PropTypes.object,
    chatbubble: PropTypes.object,
  }),
};

export default React.memo(ChatFeed);
