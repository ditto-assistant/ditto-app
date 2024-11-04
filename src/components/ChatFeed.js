import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../control/firebase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import './ChatFeed.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCopy, FiDownload, FiClock, FiBarChart2, FiChevronDown } from 'react-icons/fi';
import { IoMdArrowBack } from 'react-icons/io';
import { FaBrain, FaTrash, FaSpinner } from 'react-icons/fa';
import { deleteConversation } from '../control/memory';
import { routes } from '../firebaseConfig';
import { textEmbed } from '../api/LLM';  // Add this import

const emojis = ['❤️', '👍', '👎', '😠', '😢', '😂', '❗'];
const DITTO_AVATAR_KEY = 'dittoAvatar';
const USER_AVATAR_KEY = 'userAvatar';
const MEMORY_CACHE_KEY = 'memoryCache';
const MEMORY_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MEMORY_DELETED_EVENT = 'memoryDeleted'; // Add this line
const INTERACTION_DELAY = 300; // 300ms delay to prevent accidental closures

// Add this helper function at the top level
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50); // 50ms subtle vibration
  }
};

// Add these helper functions for cache management
const getMemoryCache = () => {
  try {
    const cache = localStorage.getItem(MEMORY_CACHE_KEY);
    if (!cache) return {};
    return JSON.parse(cache);
  } catch (e) {
    console.error('Error reading memory cache:', e);
    return {};
  }
};

const setMemoryCache = (promptId, memories) => {
  try {
    const cache = getMemoryCache();
    cache[promptId] = {
      memories,
      timestamp: Date.now()
    };
    localStorage.setItem(MEMORY_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Error setting memory cache:', e);
  }
};

const getCachedMemories = (promptId) => {
  try {
    const cache = getMemoryCache();
    const entry = cache[promptId];
    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > MEMORY_CACHE_EXPIRY) {
      // Remove expired entry
      delete cache[promptId];
      localStorage.setItem(MEMORY_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return entry.memories;
  } catch (e) {
    console.error('Error getting cached memories:', e);
    return null;
  }
};

// Add this helper function near the top of the file
const validateImageUrl = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit'
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};

// Add this new function at the top level
const loadMessagesFromLocalStorage = () => {
  try {
    const prompts = JSON.parse(localStorage.getItem('prompts') || '[]');
    const responses = JSON.parse(localStorage.getItem('responses') || '[]');
    const timestamps = JSON.parse(localStorage.getItem('timestamps') || '[]');
    const pairIDs = JSON.parse(localStorage.getItem('pairIDs') || '[]');
    
    const messages = [];
    messages.push({ 
      sender: "Ditto", 
      text: "Hi! I'm Ditto.", 
      timestamp: Date.now(),
      pairID: null 
    });
    
    for (let i = 0; i < prompts.length; i++) {
      messages.push({ 
        sender: "User", 
        text: prompts[i], 
        timestamp: timestamps[i],
        pairID: pairIDs[i]
      });
      messages.push({ 
        sender: "Ditto", 
        text: responses[i], 
        timestamp: timestamps[i],
        pairID: pairIDs[i]
      });
    }
    
    return messages;
  } catch (error) {
    console.error('Error loading messages from localStorage:', error);
    return [];
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
  const [selectedReaction, setSelectedReaction] = useState({});
  const [actionOverlay, setActionOverlay] = useState(null);
  const [reactionOverlay, setReactionOverlay] = useState(null);
  const feedRef = useRef(null);
  const bottomRef = useRef(null);
  const [profilePic, setProfilePic] = useState(() => {
    return localStorage.getItem(USER_AVATAR_KEY) || '/user_placeholder.png'; // Update path
  });
  const [dittoAvatar, setDittoAvatar] = useState(() => {
    return localStorage.getItem(DITTO_AVATAR_KEY) || '/logo512.png'; // Update path
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
  const [failedImages, setFailedImages] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showScores, setShowScores] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' or 'timestamp'
  const [sortDirection, setSortDirection] = useState('desc');
  const [streamingResponses, setStreamingResponses] = useState({});
  const [animatingWord, setAnimatingWord] = useState({ index: null, word: "" });
  const streamTimeoutRef = useRef(null);
  const [newMessageAnimation, setNewMessageAnimation] = useState(false);
  const [lastMessageIndex, setLastMessageIndex] = useState(-1);

  useEffect(() => {
    // Only load messages if the current messages array is empty
    if (messages.length <= 1) {
      const savedMessages = loadMessagesFromLocalStorage();
      if (savedMessages.length > 0) {
        updateConversation(prevState => ({
          ...prevState,
          messages: savedMessages
        }));
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    const handleStreamUpdate = (event) => {
      const { responseIndex, word, fullResponse, isNewMessage } = event.detail;
      
      // Update streaming responses with full text
      setStreamingResponses(prev => ({
        ...prev,
        [responseIndex]: fullResponse
      }));
      
      // Set the currently animating word
      setAnimatingWord({
        index: responseIndex,
        word: word
      });
      
      // Clear previous timeout
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      
      // Set new timeout to clear animation
      streamTimeoutRef.current = setTimeout(() => {
        setAnimatingWord({ index: null, word: "" });
      }, 400); // Animation duration
      
      // Scroll smoothly as new content arrives
      if (bottomRef.current) {
        // Check if user is near bottom before auto-scrolling
        const feedElement = feedRef.current;
        const isNearBottom = feedElement && 
          (feedElement.scrollHeight - feedElement.scrollTop - feedElement.clientHeight < 100);

        if (isNearBottom || isNewMessage) {
          bottomRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        }
      }
    };

    window.addEventListener('responseStreamUpdate', handleStreamUpdate);
    return () => {
      window.removeEventListener('responseStreamUpdate', handleStreamUpdate);
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottomOfFeed = (quick = false) => {
    if (bottomRef.current) {
      const scrollOptions = {
        behavior: quick ? 'auto' : 'smooth',
        block: 'end',
        inline: 'nearest'
      };
      bottomRef.current.scrollIntoView(scrollOptions);
    }
  };

  useEffect(() => {
    if (messages.length > 0 && (startAtBottom || scrollToBottom)) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottomOfFeed(false);
      });
    }
  }, [messages, scrollToBottom, startAtBottom]);

  useEffect(() => {
    // Cache Ditto avatar
    fetch('/logo512.png')
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          localStorage.setItem(DITTO_AVATAR_KEY, base64data);
          setDittoAvatar(base64data);
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => console.error('Error caching Ditto avatar:', error));

    // Cache user avatar
    if (auth.currentUser) {
      const photoURL = auth.currentUser.photoURL;
      console.log('User photo URL:', photoURL);

      if (photoURL) {
        // Remove credentials and modify fetch options for Google photos
        fetch(photoURL, {
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'image/*'
          },
          cache: 'force-cache'
        })
          .then(response => {
            // Immediately throw if we get rate limited
            if (response.status === 429) {
              throw new Error('Rate limited');
            }
            if (!response.ok) {
              throw new Error(`Failed to fetch photo: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result;
              localStorage.setItem(USER_AVATAR_KEY, base64data);
              setProfilePic(base64data);
            };
            reader.readAsDataURL(blob);
          })
          .catch((error) => {
            console.log('Using fallback photo due to error:', error.message);
            // Immediately use fallback without trying additional fetches
            fetch('/user_placeholder.png')
              .then(response => response.blob())
              .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64data = reader.result;
                  localStorage.setItem(USER_AVATAR_KEY, base64data);
                  setProfilePic(base64data);
                };
                reader.readAsDataURL(blob);
              })
              .catch(error => {
                console.error('Error loading placeholder:', error);
                setProfilePic('/user_placeholder.png');
              });
          });
      } else {
        setProfilePic('/user_placeholder.png');
        console.log('No user photo URL, using placeholder');
      }
    } else {
      setProfilePic('/user_placeholder.png');
      console.log('No authenticated user, using placeholder');
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
      if (deltaX > TOUCH_THRESHOLD || deltaY > TOUCH_THRESHOLD || touchDuration < TIME_THRESHOLD) {
        return;
      }

      const target = document.elementFromPoint(touchEndX, touchEndY);
      if (!target) return;

      // Don't close if touching inside overlays
      const isOverlayTouch = target.closest('.action-overlay') || 
                            target.closest('.reaction-overlay') ||
                            target.closest('.action-button');
                          
      if (isOverlayTouch) return;

      // Get the touched bubble
      const touchedBubble = target.closest('.chat-bubble');
      
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

      const isOverlayClick = e.target.closest('.action-overlay') || 
                            e.target.closest('.reaction-overlay') ||
                            e.target.closest('.action-button');
                          
      if (isOverlayClick) return;

      const clickedBubble = e.target.closest('.chat-bubble');
      
      if (!isOverlayClick && !clickedBubble) {
        isClosing = true;
        setTimeout(() => {
          setActionOverlay(null);
          setReactionOverlay(null);
        }, 50);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, true);
    document.addEventListener('touchend', handleTouchEnd, true);
    document.addEventListener('mousedown', handleMouseDown, true);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
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

  const handleReaction = (index, emoji) => {
    setReactions((prevReactions) => ({
      ...prevReactions,
      [index]: [...(prevReactions[index] || []), emoji],
    }));
    setReactionOverlay(null);
    setActionOverlay(null);
  };

  const handleBubbleInteraction = (e, index) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't show action overlay if user is selecting text
    if (window.getSelection().toString() || isSelecting) {
      return;
    }

    // Don't show action overlay if click was on an image
    if (e.target.classList.contains('chat-image')) {
      return;
    }

    // Trigger haptic feedback
    triggerHapticFeedback();

    // Calculate position for the overlay
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || (rect.left + rect.width / 2);
    const y = e.clientY || (rect.top + rect.height / 2);

    setActionOverlay({
      index,
      clientX: x,
      clientY: y,
      type: 'text' // Always show text actions since image has its own handler
    });

    // Close any open reaction overlay
    setReactionOverlay(null);
  };

  const handleImageClick = (src) => {
    setImageOverlay(src);
  };

  const handleImageDownload = (src) => {
    window.open(src, '_blank');
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
    displayText = displayText.replace(/```\./g, '```\n');

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
                color: '#3941b8', 
                textDecoration: 'none', 
                textShadow: '0 0 1px #7787d7',
                cursor: 'pointer',
                pointerEvents: 'auto'
              }} 
            >
              {children}
            </a>
          ),
          img: ({ src, alt, ...props }) => {
            if (failedImages.has(src)) {
              return <span className="invalid-image">Invalid URI</span>;
            }

            return (
              <img
                {...props}
                src={src}
                alt={alt}
                className='chat-image'
                onClick={(e) => {
                  e.stopPropagation(); // Stop bubble interaction
                  handleImageClick(src);
                }}
                onError={(e) => {
                  console.error('Image failed to load:', src);
                  setFailedImages(prev => new Set([...prev, src]));
                }}
              />
            );
          },
          code({ node, inline, className, children, ...props }) {
            let match = /language-(\w+)/.exec(className || '');
            let hasCodeBlock;
            if (displayText.match(/```/g)) {
              hasCodeBlock = displayText.match(/```/g).length % 2 === 0;
            }
            if (match === null && hasCodeBlock) {
              match = ['language-txt', 'txt'];
            }
            if (!inline && match) {
              return (
                <div className='code-container'>
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, '')}
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag='div'
                    {...props}
                    className='code-block'
                  />
                  <button
                    className='copy-button code-block-button'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(String(children).replace(/\n$/, ''));
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            } else {
              const inlineText = String(children).replace(/\n$/, '');
              return (
                <div className='inline-code-container'>
                  <code className='inline-code' {...props}>{children}</code>
                  <button
                    className='copy-button inline-code-button'
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
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat('default', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: browserTimezone
    }).format(date);
  };

  // Update the renderMessageWithAvatar function
  const renderMessageWithAvatar = (message, index) => {
    const isSmallMessage = message.text.length <= 5;
    const isUserMessage = message.sender === 'User';
    const isNewMessage = index === messages.length - 1 && index > lastMessageIndex;
    const showTypingIndicator = message.isTyping && message.text === "";
    const hasToolStatus = message.toolStatus && message.toolType;

    const handleTouchStart = (e) => {
      // Check if text is selected
      if (window.getSelection().toString()) {
        return; // Allow native context menu if text is selected
      }

      const timer = setTimeout(() => {
        handleBubbleInteraction(e, index);
      }, 500); // 500ms long press
      
      setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    return (
      <motion.div
        key={`${message.pairID}-${index}`}
        className={`message-container ${isUserMessage ? 'User' : 'Ditto'}`}
        initial={isNewMessage ? { 
          opacity: 0, 
          y: 20,
          scale: 0.9
        } : false}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: 1
        }}
        transition={{ 
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        {message.sender === 'Ditto' && (
          <img src={dittoAvatar} alt='Ditto' className='avatar ditto-avatar' />
        )}
        <div
          className={`chat-bubble ${isUserMessage ? 'User' : 'Ditto'} ${
            actionOverlay && actionOverlay.index === index ? 'blurred' : ''
          } ${isSmallMessage ? 'small-message' : ''}`}
          style={bubbleStyles.chatbubble}
          onClick={(e) => handleBubbleInteraction(e, index)}
          onContextMenu={(e) => handleBubbleInteraction(e, index)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
          onMouseDown={() => setIsSelecting(false)}
          onMouseMove={(e) => {
            if (e.buttons === 1) {
              setIsSelecting(true);
            }
          }}
          onMouseUp={() => {
            setTimeout(() => setIsSelecting(false), 100);
          }}
          data-index={index}
        >
          {hasToolStatus && (
            <div className={`tool-badge ${message.toolType}`}>
              {message.toolType.toUpperCase()}
            </div>
          )}
          {showSenderName && message.sender && (
            <div className='sender-name'>{message.sender}</div>
          )}
          <div className='message-text' style={bubbleStyles.text}>
            {showTypingIndicator ? (
              <div className='typing-indicator'>
                <div className='typing-dot' style={{ '--i': 0 }} />
                <div className='typing-dot' style={{ '--i': 1 }} />
                <div className='typing-dot' style={{ '--i': 2 }} />
              </div>
            ) : (
              renderMessageText(message.text, index, message.sender)
            )}
          </div>
          {hasToolStatus && message.toolStatus !== "complete" && (
            <div className={`tool-status ${message.toolStatus === "failed" ? "failed" : ""}`}>
              {message.toolStatus}
              {message.showTypingDots && (
                <div className="typing-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              )}
            </div>
          )}
          <div className='message-footer'>
            <div className='message-timestamp'>{formatTimestamp(message.timestamp)}</div>
          </div>
          {reactions[index] && reactions[index].length > 0 && (
            <div className='message-reactions'>
              {reactions[index].map((emoji, emojiIndex) => (
                <span key={emojiIndex} className='reaction'>
                  {emoji}
                </span>
              ))}
            </div>
          )}
        </div>
        {message.sender === 'User' && (
          <img src={profilePic} alt='User' className='avatar user-avatar' />
        )}
        {actionOverlay && actionOverlay.index === index && (
          <div 
            className='action-overlay' 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${actionOverlay.clientX}px`,
              top: `${actionOverlay.clientY}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <button onClick={() => handleCopy(messages[actionOverlay.index].text)} className='action-button'>
              Copy
            </button>
            <button 
              onClick={() => handleReactionOverlay(
                actionOverlay.index, 
                actionOverlay.clientX, 
                actionOverlay.clientY
              )} 
              className='action-button'
            >
              React
            </button>
            <button 
              onClick={() => handleShowMemories(actionOverlay.index)} 
              className='action-button'
              disabled={loadingMemories}
            >
              <FaBrain style={{ marginRight: '5px' }} />
              {loadingMemories ? 'Loading...' : 'Memories'}
            </button>
            <button 
              onClick={() => handleMessageDelete(actionOverlay.index)} 
              className='action-button delete-action'
            >
              <FaTrash style={{ marginRight: '5px' }} />
              Delete
            </button>
          </div>
        )}
        {reactionOverlay === index && (
          <div className='reaction-overlay' onClick={(e) => e.stopPropagation()}>
            {emojis.map((emoji) => (
              <button key={emoji} onClick={() => handleReaction(index, emoji)} className='emoji-button'>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const adjustOverlayPosition = (left, top) => {
    const overlay = document.querySelector('.reaction-overlay');
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

  // Add scroll handler to feedRef
  useEffect(() => {
    const handleScroll = () => {
      if (actionOverlay || reactionOverlay) {
        setActionOverlay(null);
        setReactionOverlay(null);
      }
    };

    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (feedElement) {
        feedElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [actionOverlay, reactionOverlay]);

  const handleReactionOverlay = (index, clientX, clientY) => {
    setReactionOverlay({
      index,
      clientX,
      clientY
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
      if (message.sender === 'User') {
        promptToUse = message.text;
        currentPairID = message.pairID;
      } else {
        if (index > 0 && messages[index - 1].sender === 'User') {
          promptToUse = messages[index - 1].text;
          currentPairID = messages[index - 1].pairID;
        } else {
          console.error('Could not find corresponding prompt for response');
          setLoadingMemories(false);
          return;
        }
      }

      // Create a unique ID for this prompt
      const promptId = `${userID}-${promptToUse}`;

      // Check cache first
      const cachedMemories = getCachedMemories(promptId);
      if (cachedMemories) {
        console.log('Using cached memories');
        // Filter out the current conversation from cached memories
        const filteredMemories = cachedMemories.filter(memory => memory.id !== currentPairID);
        setRelatedMemories(filteredMemories);
        setMemoryOverlay({ index, clientX: actionOverlay.clientX, clientY: actionOverlay.clientY });
        setActionOverlay(null);
        setLoadingMemories(false);
        return;
      }

      // Get embedding for the prompt
      const embedding = await textEmbed(promptToUse);
      if (!embedding) {
        console.error('Could not generate embedding for prompt');
        setLoadingMemories(false);
        return;
      }

      // Use the embedding to search for memories, requesting one extra (k=6)
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(routes.memories, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          userId: userID,
          vector: embedding,
          k: 6 // Request one extra memory
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }

      const data = await response.json();
      let memories = data.memories || [];
      
      // Filter out the current conversation
      memories = memories.filter(memory => memory.id !== currentPairID);
      
      // Only keep the first 5 memories after filtering
      memories = memories.slice(0, 5);
      
      // Cache the filtered results
      setMemoryCache(promptId, memories);
      
      setRelatedMemories(memories);
      setMemoryOverlay({ index, clientX: actionOverlay.clientX, clientY: actionOverlay.clientY });
      setActionOverlay(null);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Memory fetch cancelled');
      } else {
        console.error('Error fetching memories:', error);
      }
    } finally {
      setLoadingMemories(false);
      setAbortController(null);
    }
  };

  const handleDeleteMemory = async (memory, idx) => {
    const userID = auth.currentUser.uid;
    
    // Show confirmation overlay with docId that came from get-memories
    setDeleteConfirmation({
      memory,
      idx,
      docId: memory.id // Use the id that came from get-memories
    });
  };

  // Update handleMessageDelete to use pairID directly
  const handleMessageDelete = async (index) => {
    const message = messages[index];
    const userID = auth.currentUser.uid;
    
    // Get the pairID from the message
    const pairID = message.pairID;
    
    if (!pairID) {
      console.error('No pairID found for message:', message);
      return;
    }
    
    // Show confirmation overlay
    setDeleteConfirmation({
      memory: {
        prompt: message.sender === 'Ditto' && index > 0 ? messages[index - 1].text : message.text,
        response: message.sender === 'Ditto' ? message.text : null
      },
      idx: index,
      docId: pairID,
      isMessageDelete: true
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
      if (isMessageDelete) {
        setDeletingMemories(prev => new Set([...prev, idx]));
      }
      await new Promise(resolve => setTimeout(resolve, 300));

      const success = await deleteConversation(userID, docId);
      
      if (success) {
        if (isMessageDelete) {
          // Find the pair of messages to delete (user message and Ditto response)
          const pairToDelete = messages.filter(msg => msg.pairID === docId);
          if (pairToDelete.length > 0) {
            // Update conversation state to remove the message pair
            updateConversation((prevState) => ({
              ...prevState,
              messages: prevState.messages.filter(msg => msg.pairID !== docId)
            }));

            // Update local storage
            const prompts = JSON.parse(localStorage.getItem("prompts") || "[]");
            const responses = JSON.parse(localStorage.getItem("responses") || "[]");
            const timestamps = JSON.parse(localStorage.getItem("timestamps") || "[]");
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
          }
        } else {
          const newMemories = relatedMemories.filter((_, i) => i !== idx);
          setRelatedMemories(newMemories);
          
          if (newMemories.length === 0) {
            setMemoryOverlay(null);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setDeletingMemories(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      setDeleteConfirmation(null);
    }
  };

  // Add this useEffect to listen for memory deletion events
  useEffect(() => {
    const handleMemoryDeleted = () => {
      // Refresh the chat feed by updating the messages state
      const prompts = JSON.parse(localStorage.getItem('prompts') || '[]');
      const responses = JSON.parse(localStorage.getItem('responses') || '[]');
      const timestamps = JSON.parse(localStorage.getItem('timestamps') || '[]');
      
      const newMessages = [];
      newMessages.push({ sender: "Ditto", text: "Hi! I'm Ditto.", timestamp: Date.now() });
      
      for (let i = 0; i < prompts.length; i++) {
        newMessages.push({ 
          sender: "User", 
          text: prompts[i], 
          timestamp: timestamps[i] 
        });
        newMessages.push({ 
          sender: "Ditto", 
          text: responses[i], 
          timestamp: timestamps[i] 
        });
      }
      
      // Update the messages state
      updateConversation((prevState) => ({
        ...prevState,
        messages: newMessages
      }));
    };

    window.addEventListener('memoryDeleted', handleMemoryDeleted);
    
    return () => {
      window.removeEventListener('memoryDeleted', handleMemoryDeleted);
    };
  }, [updateConversation]);

  // Update the memory-list rendering in the return statement
  const renderMemoryContent = (content) => {
    return (
      <ReactMarkdown
        children={content}
        components={{
          img: ({ src, alt }) => {
            if (failedImages.has(src)) {
              return <span className="invalid-image">Invalid URI</span>;
            }

            return (
              <div className="memory-image-container">
                <img
                  src={src}
                  alt={alt}
                  className="memory-image"
                  onClick={() => handleImageClick(src)}
                  onError={(e) => {
                    console.error('Memory image failed to load:', src);
                    setFailedImages(prev => new Set([...prev, src]));
                  }}
                />
              </div>
            );
          },
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            
            // Check if this is a code block
            const isCodeBlock = !inline && (match || (content.includes('```') && content.split('```').length > 1));
            
            const handleCodeCopy = (e, text) => {
              e.stopPropagation();
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            };
            
            if (isCodeBlock) {
              const language = match ? match[1] : 'text';
              return (
                <div className='code-container memory-code-container' data-language={language}>
                  <SyntaxHighlighter
                    children={codeContent}
                    style={vscDarkPlus}
                    language={language}
                    PreTag='div'
                    {...props}
                    className='code-block'
                  />
                  <button
                    className='copy-button code-block-button'
                    onClick={(e) => handleCodeCopy(e, codeContent)}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            }

            // Inline code
            return (
              <div className='inline-code-container memory-inline-code'>
                <code className='inline-code' {...props}>{codeContent}</code>
                <button
                  className='copy-button inline-code-button'
                  onClick={(e) => handleCodeCopy(e, codeContent)}
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </div>
            );
          }
        }}
      />
    );
  };

  const formatFullTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  const handleSort = (type) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('desc');
    }
  };

  const getSortedMemories = () => {
    if (!relatedMemories) return [];
    
    return [...relatedMemories].sort((a, b) => {
      if (sortBy === 'relevance') {
        const comparison = b.score - a.score;
        return sortDirection === 'asc' ? -comparison : comparison;
      } else {
        const comparison = new Date(b.timestampString) - new Date(a.timestampString);
        return sortDirection === 'asc' ? -comparison : comparison;
      }
    });
  };

  // Add a new useEffect to handle window resize events
  useEffect(() => {
    const handleResize = () => {
      if (messages.length > 0) {
        // Use immediate scroll for resize events
        scrollToBottomOfFeed(true);
      }
    };

    const debouncedResize = debounce(handleResize, 100);
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
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

  return (
    <div className='chat-feed' ref={feedRef}>
      {messages.map(renderMessageWithAvatar)}
      {hasInputField && <input type='text' className='chat-input-field' />}
      {copied && <div className='copied-notification'>Copied!</div>}
      <div ref={bottomRef} />
      {reactionOverlay && (
        <div 
          className='reaction-overlay' 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            ...adjustOverlayPosition(reactionOverlay.clientX, reactionOverlay.clientY),
            transform: 'translate(-50%, -50%)',
          }}
        >
          {emojis.map((emoji) => (
            <button key={emoji} onClick={() => handleReaction(reactionOverlay.index, emoji)} className='emoji-button'>
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
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="memory-header">
                <h3>Related Memories</h3>
                <button className="close-button" onClick={() => setMemoryOverlay(null)}>×</button>
              </div>
              <div className="memory-controls">
                <div className="memory-controls-left">
                  <button 
                    className={`memory-control-button ${sortBy === 'relevance' ? 'active' : ''}`}
                    onClick={() => handleSort('relevance')}
                  >
                    <FiBarChart2 />
                    Relevance
                    <span className={`sort-direction ${sortBy === 'relevance' && sortDirection === 'asc' ? 'asc' : ''}`}>
                      <FiChevronDown />
                    </span>
                  </button>
                  <button 
                    className={`memory-control-button ${sortBy === 'timestamp' ? 'active' : ''}`}
                    onClick={() => handleSort('timestamp')}
                  >
                    <FiClock />
                    Time
                    <span className={`sort-direction ${sortBy === 'timestamp' && sortDirection === 'asc' ? 'asc' : ''}`}>
                      <FiChevronDown />
                    </span>
                  </button>
                </div>
                <div className="memory-controls-right">
                  <div className="score-toggle">
                    <span>Show Scores</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showScores}
                        onChange={(e) => setShowScores(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="memory-list">
                {getSortedMemories().map((memory, idx) => (
                  <motion.div
                    key={idx}
                    className="memory-item"
                    initial={{ opacity: 1, height: 'auto', scale: 1 }}
                    animate={{
                      opacity: deletingMemories.has(idx) ? 0 : 1,
                      height: deletingMemories.has(idx) ? 0 : 'auto',
                      scale: deletingMemories.has(idx) ? 0.8 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {showScores && (
                      <div className="memory-score">
                        Relevance: {(memory.score * 100).toFixed(2)}%
                      </div>
                    )}
                    <div className="memory-prompt">
                      {renderMemoryContent(memory.prompt)}
                    </div>
                    <div className="memory-response">
                      {renderMemoryContent(memory.response)}
                    </div>
                    <div className="memory-footer">
                      <div className="memory-timestamp">
                        {formatFullTimestamp(new Date(memory.timestampString).getTime())}
                      </div>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteMemory(memory, idx)}
                        disabled={deletingMemories.has(idx)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
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
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="delete-confirmation-title">Delete Message?</div>
              <div className="delete-confirmation-message">
                Are you sure you want to delete this message? This action cannot be undone.
              </div>
              {deleteConfirmation.isLoading ? (
                <div className="delete-confirmation-loading">
                  <FaSpinner className="spinner" />
                  <div>Finding message in database...</div>
                </div>
              ) : deleteConfirmation.error ? (
                <div className="delete-confirmation-docid not-found">
                  {deleteConfirmation.error}
                </div>
              ) : (
                <div className={`delete-confirmation-docid ${!deleteConfirmation.docId ? 'not-found' : ''}`}>
                  Document ID: {deleteConfirmation.docId || 'Not found'}
                </div>
              )}
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
                  disabled={deleteConfirmation.isLoading || !deleteConfirmation.docId}
                >
                  Delete
                </button>
              </div>
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
