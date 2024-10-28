import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../control/firebase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import './ChatFeed.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCopy, FiDownload } from 'react-icons/fi';
import { IoMdArrowBack } from 'react-icons/io';
import { FaBrain, FaTrash } from 'react-icons/fa';
import { findConversationDocId, getConversationEmbedding, deleteConversation } from '../control/memory';
import { routes } from '../firebaseConfig';

const emojis = ['❤️', '👍', '👎', '😠', '😢', '😂', '❗'];
const DITTO_AVATAR_KEY = 'dittoAvatar';
const USER_AVATAR_KEY = 'userAvatar';
const MEMORY_CACHE_KEY = 'memoryCache';
const MEMORY_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Add this helper function at the top level
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
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

// Add this new event name constant at the top level
const MEMORY_DELETED_EVENT = 'memoryDeleted';

export default function ChatFeed({
  messages,
  histCount,
  isTyping = false,
  hasInputField = false,
  showSenderName = false,
  bubblesCentered = false,
  scrollToBottom = false,
  startAtBottom = false,
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
    return localStorage.getItem(USER_AVATAR_KEY) || '../user_placeholder.png';
  });
  const [dittoAvatar, setDittoAvatar] = useState(() => {
    return localStorage.getItem(DITTO_AVATAR_KEY) || '../logo512.png';
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

  const scrollToBottomOfFeed = (quick = false) => {
    if (bottomRef.current) {
      if (quick) {
        bottomRef.current.scrollIntoView();
      } else {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (startAtBottom) {
      scrollToBottomOfFeed(true);
    } else {
      if (scrollToBottom) {
        const timeoutId = setTimeout(() => {
          scrollToBottomOfFeed();
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Cache Ditto avatar
    fetch('../logo512.png')
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
      if (photoURL) {
        fetch(photoURL)
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
          .catch(() => {
            const fallbackURL = '../user_placeholder.png';
            fetch(fallbackURL)
              .then(response => response.blob())
              .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64data = reader.result;
                  localStorage.setItem(USER_AVATAR_KEY, base64data);
                  setProfilePic(base64data);
                };
                reader.readAsDataURL(blob);
              });
          });
      } else {
        fetch('../user_placeholder.png')
          .then(response => response.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result;
              localStorage.setItem(USER_AVATAR_KEY, base64data);
              setProfilePic(base64data);
            };
            reader.readAsDataURL(blob);
          });
      }
    }
  }, []);

  useEffect(() => {
    const handleClickAway = (e) => {
      // Don't close if clicking inside action or reaction overlays
      if (e.target.closest('.action-overlay') || e.target.closest('.reaction-overlay')) {
        return;
      }
      
      // Don't close if clicking the originating chat bubble
      if (actionOverlay && e.target.closest('.chat-bubble')) {
        const bubbleIndex = parseInt(e.target.closest('.chat-bubble').dataset.index);
        if (bubbleIndex === actionOverlay.index) {
          return;
        }
      }
      
      setActionOverlay(null);
      setReactionOverlay(null);
    };

    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
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

  const handleBubbleInteraction = (e, index, type = 'text') => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const isUserMessage = messages[index].sender === 'User';

    // Trigger haptic feedback on mobile devices
    triggerHapticFeedback();

    // Close the overlay if clicking the same bubble that opened it
    if (actionOverlay && actionOverlay.index === index) {
      setActionOverlay(null);
      return;
    }

    // If clicking a different bubble, close current overlay and open new one
    if (actionOverlay && actionOverlay.index !== index) {
      setActionOverlay(null);
    }

    const clientX = e.clientX || (rect.left + rect.width / 2);
    const clientY = e.clientY || (rect.top + rect.height / 2);
    setActionOverlay({ 
      index, 
      type, 
      clientX,
      clientY,
      isUserMessage,
      rect // Store the bubble's rect for positioning
    });
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

  const renderMessageText = (text, index) => {
    text = text.replace(/```[a-zA-Z0-9]+/g, (match) => `\n${match}`);
    text = text.replace(/```\./g, '```\n');
    return (
      <ReactMarkdown
        children={text}
        components={{
          a: ({ node, ...props }) => <a {...props} style={{ color: '#3941b8', textDecoration: 'none', textShadow: '0 0 1px #7787d7' }} />,
          img: ({ src, alt, ...props }) => (
            <img
              {...props}
              src={src}
              alt={alt}
              className='chat-image'
              onClick={(e) => {
                e.stopPropagation(); // Prevent bubble interaction
                handleImageClick(src);
              }}
            />
          ),
          code({ node, inline, className, children, ...props }) {
            let match = /language-(\w+)/.exec(className || '');
            let hasCodeBlock;
            if (text.match(/```/g)) {
              hasCodeBlock = text.match(/```/g).length % 2 === 0;
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

  const renderMessageWithAvatar = (message, index) => {
    const isSmallMessage = message.text.length <= 5;
    const isUserMessage = message.sender === 'User';

    return (
      <div
        key={index}
        className={`message-container ${isUserMessage ? 'User' : 'Ditto'}`}
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
          data-index={index}
        >
          {showSenderName && message.sender && <div className='sender-name'>{message.sender}</div>}
          <div className='message-text' style={bubbleStyles.text}>
            {renderMessageText(message.text, index)}
          </div>
          <div className='message-footer'>
            <div className='message-timestamp'>{formatTimestamp(message.timestamp)}</div>
          </div>
          {reactions[index] && reactions[index].length > 0 && (
            <div className='message-reactions'>
              {reactions[index].map((emoji, emojiIndex) => (
                <span key={emojiIndex} className='reaction'>{emoji}</span>
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
            {actionOverlay.type === 'text' ? (
              <>
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
              </>
            ) : (
              <>
                <button onClick={() => handleImageOpen(messages[actionOverlay.index].text)} className='action-button'>
                  Open
                </button>
                <button onClick={() => handleImageDownload(messages[actionOverlay.index].text)} className='action-button'>
                  Download
                </button>
              </>
            )}
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
      </div>
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
      // Create new AbortController for this request
      const controller = new AbortController();
      setAbortController(controller);
      setLoadingMemories(true);

      const message = messages[index];
      const userID = auth.currentUser.uid;
      
      let promptToUse;
      if (message.sender === 'User') {
        promptToUse = message.text;
      } else {
        if (index > 0 && messages[index - 1].sender === 'User') {
          promptToUse = messages[index - 1].text;
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
        setRelatedMemories(cachedMemories);
        setMemoryOverlay({ index, clientX: actionOverlay.clientX, clientY: actionOverlay.clientY });
        setActionOverlay(null);
        setLoadingMemories(false);
        return;
      }

      // If not in cache, proceed with fetching
      const docId = await findConversationDocId(userID, promptToUse);
      if (!docId) {
        console.error('Could not find conversation document');
        setLoadingMemories(false);
        return;
      }

      const embedding = await getConversationEmbedding(userID, docId);
      if (!embedding) {
        console.error('Could not find conversation embedding');
        setLoadingMemories(false);
        return;
      }

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
          k: 5
        }),
        signal: controller.signal // Add abort signal to fetch
      });

      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }

      const data = await response.json();
      const memories = data.memories || [];
      
      // Cache the results
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
    const docId = await findConversationDocId(userID, memory.prompt);
    
    // Show confirmation overlay with docId for debugging
    setDeleteConfirmation({
      memory,
      idx,
      docId
    });
  };

  // Update the confirmDelete function
  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    const { memory, idx, docId } = deleteConfirmation;
    const userID = auth.currentUser.uid;
    
    try {
      setDeletingMemories(prev => new Set([...prev, idx]));
      await new Promise(resolve => setTimeout(resolve, 300));

      const success = await deleteConversation(userID, docId);
      
      if (success) {
        // Update related memories in the UI
        const newMemories = relatedMemories.filter((_, i) => i !== idx);
        setRelatedMemories(newMemories);
        
        // Remove from localStorage cache
        const promptId = `${userID}-${memory.prompt}`;
        const cache = getMemoryCache();
        delete cache[promptId];
        localStorage.setItem(MEMORY_CACHE_KEY, JSON.stringify(cache));

        // Remove from localStorage conversation history
        const prompts = JSON.parse(localStorage.getItem('prompts') || '[]');
        const responses = JSON.parse(localStorage.getItem('responses') || '[]');
        const timestamps = JSON.parse(localStorage.getItem('timestamps') || '[]');

        // Find the index of the conversation in the arrays
        const conversationIndex = prompts.findIndex(p => p === memory.prompt);
        
        if (conversationIndex !== -1) {
          // Remove the conversation from all arrays
          prompts.splice(conversationIndex, 1);
          responses.splice(conversationIndex, 1);
          timestamps.splice(conversationIndex, 1);

          // Update localStorage
          localStorage.setItem('prompts', JSON.stringify(prompts));
          localStorage.setItem('responses', JSON.stringify(responses));
          localStorage.setItem('timestamps', JSON.stringify(timestamps));
          localStorage.setItem('histCount', (prompts.length).toString());

          // Dispatch custom event to trigger re-render
          window.dispatchEvent(new CustomEvent(MEMORY_DELETED_EVENT, {
            detail: { conversationIndex }
          }));
        }
        
        if (newMemories.length === 0) {
          setMemoryOverlay(null);
        }
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
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
      // Force re-render by updating messages
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
      
      // Update the messages prop through parent component
      if (typeof messages !== 'undefined') {
        messages.length = 0;
        messages.push(...newMessages);
      }
    };

    window.addEventListener(MEMORY_DELETED_EVENT, handleMemoryDeleted);
    
    return () => {
      window.removeEventListener(MEMORY_DELETED_EVENT, handleMemoryDeleted);
    };
  }, [messages]);

  return (
    <div className='chat-feed' ref={feedRef}>
      {messages.map(renderMessageWithAvatar)}
      {isTyping && (
        <div className='typing-indicator'>
          <div className='typing-dot' style={{ '--i': 0 }} />
          <div className='typing-dot' style={{ '--i': 1 }} />
          <div className='typing-dot' style={{ '--i': 2 }} />
        </div>
      )}
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
      {memoryOverlay && (
        <div 
          className='memory-overlay'
          onClick={() => setMemoryOverlay(null)} // Close when clicking overlay
        >
          <div 
            className='memory-content'
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
          >
            <div className='memory-header'>
              <h3>Related Memories</h3>
              <button 
                className='close-button'
                onClick={() => setMemoryOverlay(null)}
              >
                ×
              </button>
            </div>
            <div className='memory-list'>
              {relatedMemories.map((memory, idx) => (
                <motion.div
                  key={idx}
                  className='memory-item'
                  initial={{ opacity: 1, height: 'auto', scale: 1 }}
                  animate={{
                    opacity: deletingMemories.has(idx) ? 0 : 1,
                    height: deletingMemories.has(idx) ? 0 : 'auto',
                    scale: deletingMemories.has(idx) ? 0.8 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div className='memory-prompt'>
                    <ReactMarkdown
                      children={memory.prompt}
                      components={{
                        img: ({ src, alt }) => (
                          <div className="memory-image-container">
                            <img
                              src={src}
                              alt={alt}
                              className="memory-image"
                              onClick={() => handleImageClick(src)}
                            />
                          </div>
                        ),
                      }}
                    />
                  </div>
                  <div className='memory-response'>
                    <ReactMarkdown
                      children={memory.response}
                      components={{
                        img: ({ src, alt }) => (
                          <div className="memory-image-container">
                            <img
                              src={src}
                              alt={alt}
                              className="memory-image"
                              onClick={() => handleImageClick(src)}
                            />
                          </div>
                        ),
                      }}
                    />
                  </div>
                  <div className='memory-footer'>
                    <div className='memory-timestamp'>
                      {formatTimestamp(new Date(memory.timestampString).getTime())}
                    </div>
                    <button
                      className='delete-button'
                      onClick={() => handleDeleteMemory(memory, idx)}
                      disabled={deletingMemories.has(idx)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
      {deleteConfirmation && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation-content">
            <div className="delete-confirmation-title">Delete Memory?</div>
            <div className="delete-confirmation-message">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </div>
            <div className="delete-confirmation-docid">
              Document ID: {deleteConfirmation.docId || 'Not found'}
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
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
