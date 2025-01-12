import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { auth, saveFeedback } from "../control/firebase";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import "./ChatFeed.css";
import { motion, AnimatePresence } from "framer-motion";
import { FiCopy, FiDownload } from "react-icons/fi";
import { IoMdArrowBack } from "react-icons/io";
import { FaBrain, FaTrash, FaSpinner } from "react-icons/fa";
import { deleteConversation } from "../control/memory";
import { routes } from "../firebaseConfig";
import { textEmbed } from "../api/LLM"; // Add this import
import MemoryNetwork from "./MemoryNetwork";
import { useTokenStreaming } from "../hooks/useTokenStreaming";
import { processResponse } from "../control/agent";
import { LoadingSpinner } from "./LoadingSpinner";
import { usePresignedUrls } from "../hooks/usePresignedUrls";
import { useMemoryDeletion } from "../hooks/useMemoryDeletion";
import { useModelPreferences } from "../hooks/useModelPreferences";
import { IMAGE_PLACEHOLDER_IMAGE, NOT_FOUND_IMAGE } from "@/constants";
import { toast } from "react-hot-toast";
import { getMemories } from "@/api/getMemories";
const emojis = ["❤️", "👍", "👎", "😠", "😢", "😂", "❗"];
const DITTO_AVATAR_KEY = "dittoAvatar";
const USER_AVATAR_KEY = "userAvatar";
const AVATAR_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const AVATAR_FETCH_COOLDOWN = 60 * 1000; // 1 minute cooldown between fetch attempts

// Add this helper function at the top level
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50); // 50ms subtle vibration
  }
};

// Add this new function at the top level
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

// Add this helper function near the top of the file
const detectToolType = (text) => {
  if (!text) return null;

  // Check for tool indicators in the message text
  if (text.includes("OpenSCAD Script Generated")) return "openscad";
  if (text.includes("HTML Script Generated")) return "html";
  if (text.includes("Image Task:")) return "image";
  if (text.includes("Google Search Query:")) return "search";
  if (text.includes("Home Assistant Task:")) return "home";

  return null;
};

// Add this helper function
const getAvatarWithCooldown = async (photoURL) => {
  try {
    const now = Date.now();
    const lastFetchAttempt = localStorage.getItem("lastAvatarFetchAttempt");
    const cachedAvatar = localStorage.getItem(USER_AVATAR_KEY);
    const cacheTimestamp = localStorage.getItem("avatarCacheTimestamp");

    // If we have a cached avatar and it's not expired, use it
    if (
      cachedAvatar &&
      cacheTimestamp &&
      now - parseInt(cacheTimestamp) < AVATAR_CACHE_DURATION
    ) {
      return cachedAvatar;
    }

    // If we're within the cooldown period, use fallback or cached avatar
    if (
      lastFetchAttempt &&
      now - parseInt(lastFetchAttempt) < AVATAR_FETCH_COOLDOWN
    ) {
      return cachedAvatar || "/user_placeholder.png";
    }

    // Update last fetch attempt timestamp
    localStorage.setItem("lastAvatarFetchAttempt", now.toString());

    // Fetch the avatar with proper options
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
        // Cache the successful result
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

export default function ChatFeed({
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
}) {
  const [copied, setCopied] = useState(false);
  const [actionOverlay, setActionOverlay] = useState(null);
  const [reactionOverlay, setReactionOverlay] = useState(null);
  const feedRef = useRef(null);
  const bottomRef = useRef(null);
  const [profilePic, setProfilePic] = useState(() => {
    return localStorage.getItem(USER_AVATAR_KEY) || "/user_placeholder.png"; // Update path
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

  useEffect(() => {
    // Only load messages if the current messages array is empty
    if (messages.length <= 1) {
      const savedMessages = loadMessagesFromLocalStorage();
      if (savedMessages.length > 0) {
        updateConversation((prevState) => ({
          ...prevState,
          messages: savedMessages,
        }));
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleStreamUpdate = useCallback(
    (event) => {
      const { chunk, isNewMessage } = event.detail;
      if (!chunk) return;

      // Process chunk through useTokenStreaming
      processChunk(chunk, isNewMessage);

      // Scroll handling in a separate effect to avoid state update conflicts
      requestAnimationFrame(() => {
        if (bottomRef.current) {
          const feedElement = feedRef.current;
          const isNearBottom =
            feedElement &&
            feedElement.scrollHeight -
              feedElement.scrollTop -
              feedElement.clientHeight <
              100;

          if (isNearBottom) {
            bottomRef.current.scrollIntoView({
              behavior: "auto",
              block: "end",
            });
          }
        }
      });
    },
    [processChunk]
  );

  useEffect(() => {
    window.addEventListener("responseStreamUpdate", handleStreamUpdate);
    return () => {
      window.removeEventListener("responseStreamUpdate", handleStreamUpdate);
    };
  }, [handleStreamUpdate]);

  // Separate effect for updating conversation with streamed text
  const updateStreamedText = useCallback(() => {
    if (messages.length > 0 && isStreaming && streamedText) {
      updateConversation((prevState) => {
        const newMessages = [...prevState.messages];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.sender === "Ditto") {
          lastMsg.text = streamedText;
        }
        return { ...prevState, messages: newMessages };
      });
    }
  }, [streamedText, isStreaming, messages, updateConversation]);

  useEffect(() => {
    const timeoutId = setTimeout(updateStreamedText, 50); // Debounce updates
    return () => clearTimeout(timeoutId);
  }, [updateStreamedText]);

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const scrollToBottomOfFeed = useCallback((quick = false) => {
    if (bottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current.scrollIntoView({
          behavior: quick ? "auto" : "smooth",
          block: "end",
          inline: "nearest",
        });
      });
    }
  }, []);

  // Scroll handling in a separate effect
  useEffect(() => {
    if (messages.length > 0 && (startAtBottom || scrollToBottom)) {
      scrollToBottomOfFeed(true);
    }
  }, [messages, scrollToBottom, startAtBottom, scrollToBottomOfFeed]);

  useEffect(() => {
    // Cache Ditto avatar - update the path to the new image
    fetch("/icons/fancy-ditto.png") // Updated path
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

    // Load user avatar with cooldown and caching
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

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const TOUCH_THRESHOLD = 10;
    const TIME_THRESHOLD = 300;
    let isClosing = false;

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isClosing = false;
    };

    const handleTouchEnd = (e) => {
      if (!actionOverlay || isClosing) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime;

      // Calculate movement
      const deltaX = Math.abs(touchEndX - touchStartX);
      const deltaY = Math.abs(touchEndY - touchStartY);

      // If movement is too large or touch duration is too short, don't close
      if (
        deltaX > TOUCH_THRESHOLD ||
        deltaY > TOUCH_THRESHOLD ||
        touchDuration < TIME_THRESHOLD
      ) {
        return;
      }

      const target = document.elementFromPoint(touchEndX, touchEndY);
      if (!target) return;

      // Don't close if touching inside overlays
      const isOverlayTouch =
        target.closest(".action-overlay") ||
        target.closest(".reaction-overlay") ||
        target.closest(".action-button");

      if (isOverlayTouch) return;

      // Get the touched bubble
      const touchedBubble = target.closest(".chat-bubble");

      // If touching outside both overlays and bubbles, close overlay
      if (!isOverlayTouch && !touchedBubble) {
        isClosing = true;
        setTimeout(() => {
          setActionOverlay(null);
          setReactionOverlay(null);
        }, 50);
        return;
      }

      // If touching a different bubble, close overlay
      if (touchedBubble) {
        const bubbleIndex = parseInt(touchedBubble.dataset.index);
        if (bubbleIndex !== actionOverlay.index) {
          isClosing = true;
          setTimeout(() => {
            setActionOverlay(null);
            setReactionOverlay(null);
          }, 50);
        }
      }
    };

    const handleMouseDown = (e) => {
      if (e.touches || !actionOverlay || isClosing) return;

      const isOverlayClick =
        e.target.closest(".action-overlay") ||
        e.target.closest(".reaction-overlay") ||
        e.target.closest(".action-button");

      if (isOverlayClick) return;

      const clickedBubble = e.target.closest(".chat-bubble");

      if (!isOverlayClick && !clickedBubble) {
        isClosing = true;
        setTimeout(() => {
          setActionOverlay(null);
          setReactionOverlay(null);
        }, 50);
      }
    };

    document.addEventListener("touchstart", handleTouchStart, true);
    document.addEventListener("touchend", handleTouchEnd, true);
    document.addEventListener("mousedown", handleMouseDown, true);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, true);
      document.removeEventListener("touchend", handleTouchEnd, true);
      document.removeEventListener("mousedown", handleMouseDown, true);
    };
  }, [actionOverlay]);

  useEffect(() => {
    if (!actionOverlay && abortController) {
      // Cancel any pending memory fetch when action overlay closes
      abortController.abort();
      setAbortController(null);
      setLoadingMemories(false);
    }
  }, [actionOverlay]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setActionOverlay(null);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReaction = useCallback(
    (index, pairID, emoji, feedback) => {
      setReactions((prevReactions) => ({
        ...prevReactions,
        [index]: [...(prevReactions[index] || []), emoji],
      }));
      setReactionOverlay(null);
      setActionOverlay(null);
      if (auth.currentUser) {
        saveFeedback(auth.currentUser.uid, pairID, emoji, feedback);
      }
    },
    [auth.currentUser]
  );

  const handleBubbleInteraction = (e, index) => {
    // Don't show action overlay if user is selecting text
    if (window.getSelection().toString()) {
      return;
    }

    // Don't show action overlay if click was on an image
    if (e.target.classList.contains("chat-image")) {
      return;
    }

    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();

    // Trigger haptic feedback
    triggerHapticFeedback();

    // If clicking the same bubble that has an open overlay, close it
    if (actionOverlay && actionOverlay.index === index) {
      setActionOverlay(null);
      setReactionOverlay(null);
      return;
    }

    // Calculate position for the overlay
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || (e.touches ? e.touches[0].clientX : rect.left + rect.width / 2);
    const y = e.clientY || (e.touches ? e.touches[0].clientY : rect.top + rect.height / 2);

    setActionOverlay({
      index,
      clientX: x,
      clientY: y,
      type: "text",
    });

    // Close any open reaction overlay
    setReactionOverlay(null);
  };

  const handleImageClick = (src) => {
    const cachedUrl = getCachedUrl(src);
    setImageOverlay(cachedUrl.ok ?? src);
  };

  const handleImageDownload = (src) => {
    window.open(src, "_blank");
  };

  const closeImageOverlay = () => {
    setImageOverlay(null);
  };

  const toggleImageControls = (e) => {
    e.stopPropagation();
    setImageControlsVisible(!imageControlsVisible);
  };

  // Update the renderMessageText function
  const renderMessageText = (text, index, sender) => {
    // First replace code block markers
    let displayText = text.replace(/```[a-zA-Z0-9]+/g, (match) => `\n${match}`);
    displayText = displayText.replace(/```\./g, "```\n");

    return (
      <ReactMarkdown
        children={displayText}
        components={{
          a: ({ node, href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation(); // Prevent bubble interaction
              }}
              style={{
                color: "#3941b8",
                textDecoration: "none",
                textShadow: "0 0 1px #7787d7",
                cursor: "pointer",
                pointerEvents: "auto",
              }}
            >
              {children}
            </a>
          ),
          p: ({ node, ...props }) => (
            <p {...props} style={{ margin: "0.5em 0" }} />
          ),
          img: ({ node, src, alt, ...props }) => {
            const [imgSrc, setImgSrc] = useState(src);
            const cachedUrl = getCachedUrl(src);
            function onClick(e) {
              e.stopPropagation();
              handleImageClick(src);
            }
            if (cachedUrl.ok) {
              return (
                <img
                  {...props}
                  src={cachedUrl.ok}
                  alt={alt}
                  className="chat-image"
                  onClick={onClick}
                />
              );
            }
            if (!src) {
              return (
                <img
                  {...props}
                  src={NOT_FOUND_IMAGE}
                  alt={alt}
                  className="chat-image"
                />
              );
            }
            if (!src.startsWith("https://firebasestorage.googleapis.com/")) {
              getPresignedUrl(src).then(
                (url) => {
                  if (url.ok) {
                    setImgSrc(url.ok);
                  }
                },
                (err) => {
                  console.error(`Image Load error: ${err}; src: ${src}`);
                }
              );
            }
            return (
              <img
                {...props}
                src={imgSrc}
                alt={alt}
                className="chat-image"
                onClick={(e) => {
                  e.stopPropagation(); // Stop bubble interaction
                  handleImageClick(src);
                }}
                onError={(e) => {
                  const errSrc = e.target.src;
                  console.error(`Image load error: ${e}; src: ${errSrc}`);
                  if (errSrc === src) {
                    setImgSrc(IMAGE_PLACEHOLDER_IMAGE);
                  } else {
                    setImgSrc(src);
                  }
                  if (errSrc.startsWith("https://ditto-content")) {
                    // give the image a chance to load
                    setTimeout(() => {
                      setImgSrc(errSrc);
                    }, 5_000);
                  }
                }}
              />
            );
          },
          code({ node, inline, className, children, ...props }) {
            let match = /language-(\w+)/.exec(className || "");
            let hasCodeBlock;
            if (displayText.match(/```/g)) {
              hasCodeBlock = displayText.match(/```/g).length % 2 === 0;
            }
            if (match === null && hasCodeBlock) {
              match = ["language-txt", "txt"];
            }
            if (!inline && match) {
              return (
                <div className="code-container">
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, "")}
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                    className="code-block"
                  />
                  <button
                    className="copy-button code-block-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(String(children).replace(/\n$/, ""));
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            } else {
              const inlineText = String(children).replace(/\n$/, "");
              return (
                <div className="inline-code-container">
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                  <button
                    className="copy-button inline-code-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(inlineText);
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            }
          },
        }}
      />
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat("default", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: browserTimezone,
    }).format(date);
  };

  // Update the renderMessageWithAvatar function
  const renderMessageWithAvatar = (message, index) => {
    const isLastMessage = index === messages.length - 1;
    const isSmallMessage = message.text.length <= 5;
    const isUserMessage = message.sender === "User";
    const showTypingIndicator = message.isTyping && message.text === "";
    const isGenerating = message.sender === "Ditto" && message.isTyping;

    // Add this to determine if this is the most recent Ditto message
    const isLastDittoMessage =
      message.sender === "Ditto" &&
      messages.findIndex((msg, i) => i > index && msg.sender === "Ditto") ===
        -1;

    // Detect tool type from message content if not already set
    const toolType = message.toolType || detectToolType(message.text);
    const hasToolStatus = message.toolStatus && toolType;

    return (
      <motion.div
        key={`${message.pairID}-${index}`}
        className={`message-container ${isUserMessage ? "User" : "Ditto"}`}
        initial={isLastMessage ? false : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {message.sender === "Ditto" && (
          <img
            src={dittoAvatar}
            alt="Ditto"
            className={`avatar ditto-avatar ${
              isLastDittoMessage && isGenerating
                ? "animating"
                : isLastDittoMessage && !isGenerating
                  ? "spinning"
                  : ""
            }`}
          />
        )}
        {showTypingIndicator ? (
          <div className="typing-indicator-container">
            <div className="typing-indicator">
              <div className="typing-dot" style={{ "--i": 0 }} />
              <div className="typing-dot" style={{ "--i": 1 }} />
              <div className="typing-dot" style={{ "--i": 2 }} />
            </div>
          </div>
        ) : (
          <div
            className={`chat-bubble ${isUserMessage ? "User" : "Ditto"} ${
              actionOverlay && actionOverlay.index === index ? "blurred" : ""
            } ${isSmallMessage ? "small-message" : ""}`}
            style={bubbleStyles.chatbubble}
            onClick={(e) => handleBubbleInteraction(e, index)}
            onContextMenu={(e) => handleBubbleInteraction(e, index)}
            data-index={index}
          >
            {toolType && (
              <div className={`tool-badge ${toolType.toLowerCase()}`}>
                {toolType.toUpperCase()}
              </div>
            )}

            {showSenderName && message.sender && (
              <div className="sender-name">{message.sender}</div>
            )}
            <div className="message-text" style={bubbleStyles.text}>
              {message.toolStatus && toolType ? (
                <>
                  {renderMessageText(message.text, index, message.sender)}
                  <div
                    className={`tool-status ${
                      message.toolStatus === "complete"
                        ? "complete"
                        : message.toolStatus === "failed"
                          ? "failed"
                          : ""
                    }`}
                  >
                    {message.toolStatus}
                    {message.showTypingDots && (
                      <div className="typing-dots">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                renderMessageText(message.text, index, message.sender)
              )}
            </div>
            <div className="message-footer">
              <div className="message-timestamp">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
            {reactions[index] && reactions[index].length > 0 && (
              <div className="message-reactions">
                {reactions[index].map((emoji, emojiIndex) => (
                  <span key={emojiIndex} className="reaction">
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {message.sender === "User" && (
          <img src={profilePic} alt="User" className="avatar user-avatar" />
        )}
        {actionOverlay && actionOverlay.index === index && (
          <div
            className="action-overlay"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: `${actionOverlay.clientX}px`,
              top: `${actionOverlay.clientY}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <button
              onClick={() => handleCopy(messages[actionOverlay.index].text)}
              className="action-button"
            >
              Copy
            </button>
            <button
              onClick={() =>
                handleReactionOverlay(
                  actionOverlay.index,
                  actionOverlay.clientX,
                  actionOverlay.clientY
                )
              }
              className="action-button"
            >
              React
            </button>
            <button
              onClick={() => handleShowMemories(actionOverlay.index)}
              className="action-button"
              disabled={loadingMemories}
            >
              <FaBrain style={{ marginRight: "5px" }} />
              {loadingMemories ? "Loading..." : "Memories"}
            </button>
            <button
              onClick={() => handleMessageDelete(actionOverlay.index)}
              className="action-button delete-action"
            >
              <FaTrash style={{ marginRight: "5px" }} />
              Delete
            </button>
          </div>
        )}
        {reactionOverlay === index && (
          <div
            className="reaction-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() =>
                  handleReaction(index, messages[index].pairID, emoji, "")
                }
                className="emoji-button"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const adjustOverlayPosition = (left, top) => {
    const overlay = document.querySelector(".reaction-overlay");
    if (!overlay) return { left, top };

    const rect = overlay.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedLeft = left;
    let adjustedTop = top;

    if (left + rect.width > viewportWidth) {
      adjustedLeft = viewportWidth - rect.width;
    }
    if (left < 0) {
      adjustedLeft = 0;
    }
    if (top + rect.height > viewportHeight) {
      adjustedTop = viewportHeight - rect.height;
    }
    if (top < 0) {
      adjustedTop = 0;
    }

    return { left: adjustedLeft, top: adjustedTop };
  };

  // Update the scroll handler useEffect
  useEffect(() => {
    const handleScroll = (e) => {
      // Close overlays immediately when scrolling starts
      if (actionOverlay || reactionOverlay) {
        setActionOverlay(null);
        setReactionOverlay(null);
      }
    };

    // Add scroll listener to both the feed container and window
    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Also listen for window scroll in case the feed is part of a larger scrollable area
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Add wheel event listeners for mouse wheel scrolling
    if (feedElement) {
      feedElement.addEventListener("wheel", handleScroll, { passive: true });
    }
    window.addEventListener("wheel", handleScroll, { passive: true });

    // Add touch move listener for mobile scrolling
    if (feedElement) {
      feedElement.addEventListener("touchmove", handleScroll, {
        passive: true,
      });
    }
    window.addEventListener("touchmove", handleScroll, { passive: true });

    return () => {
      // Clean up all event listeners
      if (feedElement) {
        feedElement.removeEventListener("scroll", handleScroll);
        feedElement.removeEventListener("wheel", handleScroll);
        feedElement.removeEventListener("touchmove", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, [actionOverlay, reactionOverlay]); // Dependencies ensure we're using current overlay states

  const handleReactionOverlay = (index, clientX, clientY) => {
    setReactionOverlay({
      index,
      clientX,
      clientY,
    });
    setActionOverlay(null);
  };

  const handleShowMemories = async (index) => {
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
      const memoriesResponse = await getMemories(
        {
          userID,
          longTerm: {
            vector: embedding,
            nodeCounts: [6],
          },
        },
        "application/json"
      );
      if (memoriesResponse.err) {
        throw new Error(memoriesResponse.err);
      }
      if (!memoriesResponse.ok) {
        throw new Error("Failed to fetch memories");
      }
      const topMemories = memoriesResponse.ok.longTerm.slice(1, 6);
      // For each of the top 5 memories, fetch their 2 most related memories
      const memoriesWithRelated = await Promise.all(
        topMemories.map(async (memory) => {
          const relatedEmbedding = await textEmbed(memory.prompt);
          const relatedResponse = await getMemories(
            {
              userID,
              longTerm: {
                vector: relatedEmbedding,
                nodeCounts: [3],
              },
            },
            "application/json"
          );
          if (relatedResponse.err) {
            throw new Error(relatedResponse.err);
          }
          if (!relatedResponse.ok) {
            throw new Error("Failed to fetch related memories");
          }
          // Filter out the memory itself
          const relatedMemories = relatedResponse.ok.longTerm.filter(
            (m) => m.id !== memory.id
          );
          return {
            ...memory,
            related: relatedMemories,
          };
        })
      );

      // Create the central node structure
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

      console.log("Network Data:", networkData);
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
  };

  // Update handleMessageDelete to use pairID directly
  const handleMessageDelete = async (index) => {
    const message = messages[index];
    const userID = auth.currentUser.uid;

    // Get the pairID from the message
    const pairID = message.pairID;

    if (!pairID) {
      console.error("No pairID found for message:", message);
      return;
    }

    // Show confirmation overlay
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

    // Close the action overlay
    setActionOverlay(null);
  };

  // Update confirmDelete to handle both cases
  const confirmDelete = async () => {
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
        // Close delete confirmation with animation
        setDeleteConfirmation(null);

        if (isMessageDelete) {
          // Update conversation state to remove the message pair
          updateConversation((prevState) => ({
            ...prevState,
            messages: prevState.messages.filter((msg) => msg.pairID !== docId),
          }));

          // Update local storage
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

        // Dispatch memoryUpdated event
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
  };

  // Add this useEffect to listen for memory deletion events
  useEffect(() => {
    const handleMemoryDeleted = () => {
      // Refresh the chat feed by updating the messages state
      const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
      const responses = JSON.parse(localStorage.getItem("responses") || "[]");
      const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");

      const newMessages = [];
      newMessages.push({
        sender: "Ditto",
        text: "Hi! I'm Ditto.",
        timestamp: Date.now(),
      });

      for (let i = 0; i < prompts.length; i++) {
        newMessages.push({
          sender: "User",
          text: prompts[i],
          timestamp: timestamps[i],
        });
        newMessages.push({
          sender: "Ditto",
          text: responses[i],
          timestamp: timestamps[i],
        });
      }

      // Update the messages state
      updateConversation((prevState) => ({
        ...prevState,
        messages: newMessages,
      }));
    };

    window.addEventListener("memoryDeleted", handleMemoryDeleted);

    return () => {
      window.removeEventListener("memoryDeleted", handleMemoryDeleted);
    };
  }, [updateConversation]);

  // Add a new useEffect to handle window resize events
  useEffect(() => {
    const handleResize = () => {
      if (messages.length > 0) {
        // Use immediate scroll for resize events
        scrollToBottomOfFeed(true);
      }
    };

    const debouncedResize = debounce(handleResize, 100);
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [messages]);

  // Add debounce utility function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Add effect to handle new messages
  useEffect(() => {
    if (messages.length > lastMessageIndex) {
      setNewMessageAnimation(true);
      setLastMessageIndex(messages.length);

      // Scroll to bottom with animation
      setTimeout(() => {
        scrollToBottomOfFeed(false);
        setNewMessageAnimation(false);
      }, 300); // Match animation duration
    }
  }, [messages.length]);

  // Add this effect to reset streaming state when messages change
  useEffect(() => {
    if (messages.length > lastMessageIndex) {
      reset();
      setLastMessageIndex(messages.length);
    }
  }, [messages.length, lastMessageIndex, reset]);

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
          // Process the tool trigger
          processResponse(
            streamedText,
            messages[messages.length - 2].text, // User's prompt
            messages[messages.length - 2].embedding, // User's prompt embedding
            auth.currentUser.uid,
            localStorage.getItem("workingOnScript")
              ? JSON.parse(localStorage.getItem("workingOnScript")).contents
              : "",
            localStorage.getItem("workingOnScript")
              ? JSON.parse(localStorage.getItem("workingOnScript")).script
              : "",
            messages[messages.length - 2].image || "",
            {}, // memories object - you might want to pass this properly
            updateConversation,
            preferences
          );
          return;
        }
      }
    }
  }, [isComplete, streamedText]);

  return (
    <div
      className="chat-feed"
      ref={feedRef}
      style={{ scrollBehavior: "auto" }} // Override any smooth scrolling
    >
      {messages.map(renderMessageWithAvatar)}
      {hasInputField && <input type="text" className="chat-input-field" />}
      {copied && <div className="copied-notification">Copied!</div>}
      <div ref={bottomRef} />
      {reactionOverlay && (
        <div
          className="reaction-overlay"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            ...adjustOverlayPosition(
              reactionOverlay.clientX,
              reactionOverlay.clientY
            ),
            transform: "translate(-50%, -50%)",
          }}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() =>
                handleReaction(
                  reactionOverlay.index,
                  messages[reactionOverlay.index].pairID,
                  emoji,
                  ""
                )
              }
              className="emoji-button"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {imageOverlay && (
        <AnimatePresence>
          <motion.div
            className="image-overlay"
            onClick={closeImageOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="image-overlay-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <img
                src={imageOverlay}
                alt="Full size"
                onClick={toggleImageControls}
              />
              <AnimatePresence>
                {imageControlsVisible && (
                  <motion.div
                    className="image-overlay-controls"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      className="image-control-button back"
                      onClick={closeImageOverlay}
                      title="Back"
                    >
                      <IoMdArrowBack />
                    </button>
                    <button
                      className="image-control-button download"
                      onClick={() => handleImageDownload(imageOverlay)}
                      title="Download"
                    >
                      <FiDownload />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
      <AnimatePresence>
        {memoryOverlay && (
          <motion.div
            className="memory-overlay"
            onClick={() => setMemoryOverlay(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="memory-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <MemoryNetwork
                memories={relatedMemories}
                onClose={() => setMemoryOverlay(null)}
                onMemoryDeleted={(deletedId) => {
                  const userID = auth.currentUser.uid;
                  deleteMemory(userID, deletedId);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            className="delete-confirmation-overlay"
            onClick={() => setDeleteConfirmation(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="delete-confirmation-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="delete-confirmation-title">Delete Message?</div>
              <div className="delete-confirmation-message">
                Are you sure you want to delete this message? This action cannot
                be undone.
              </div>
              {isDeletingMessage ? (
                <div className="delete-confirmation-loading">
                  <LoadingSpinner size={24} inline={true} />
                  <div>Deleting message...</div>
                </div>
              ) : (
                <>
                  <div
                    className={`delete-confirmation-docid ${
                      !deleteConfirmation.docId ? "not-found" : ""
                    }`}
                  >
                    Document ID: {deleteConfirmation.docId || "Not found"}
                  </div>
                  <div className="delete-confirmation-buttons">
                    <button
                      className="delete-confirmation-button cancel"
                      onClick={() => setDeleteConfirmation(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="delete-confirmation-button confirm"
                      onClick={confirmDelete}
                      disabled={!deleteConfirmation.docId}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

ChatFeed.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string,
      text: PropTypes.string.isRequired,
      timestamp: PropTypes.number, // Add this line to include timestamp in PropTypes
    })
  ).isRequired,
  isTyping: PropTypes.bool,
  hasInputField: PropTypes.bool,
  showSenderName: PropTypes.bool,
  bubblesCentered: PropTypes.bool,
  scrollToBottom: PropTypes.bool,
  bubbleStyles: PropTypes.shape({
    text: PropTypes.object,
    chatbubble: PropTypes.object,
  }),
};
