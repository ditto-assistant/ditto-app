import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../control/firebase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import './ChatFeed.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCopy } from 'react-icons/fi';

const emojis = ['❤️', '👍', '👎', '😠', '😢', '😂', '❗'];
const DITTO_AVATAR_KEY = 'dittoAvatar';
const USER_AVATAR_KEY = 'userAvatar';

// Add this helper function at the top level
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
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
        <AnimatePresence> {/* Add this wrapper */}
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
              <img src={imageOverlay} alt="Full size" />
              <motion.div 
                className="image-overlay-controls"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
              >
                <button className="back-button" onClick={closeImageOverlay}>
                  Back
                </button>
                <button className="download-button" onClick={() => handleImageDownload(imageOverlay)}>
                  Download
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
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
