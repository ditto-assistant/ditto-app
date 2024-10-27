import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../control/firebase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import './ChatFeed.css';
import { motion, AnimatePresence } from 'framer-motion';

const emojis = ['❤️', '👍', '👎', '😠', '😢', '😂', '❗'];

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
  const [profilePic, setProfilePic] = useState(null);
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
    if (auth.currentUser) {
      const photoURL = auth.currentUser.photoURL;
      if (photoURL) {
        setProfilePic(photoURL);
      } else {
        setProfilePic('../user_placeholder.png');
      }
    }
  }, []);

  useEffect(() => {
    const handleClickAway = (e) => {
      if (!e.target.closest('.action-overlay') && !e.target.closest('.reaction-overlay')) {
        setActionOverlay(null);
        setReactionOverlay(null);
      }
    };
    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);

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

  const handleLongPress = (e, index, type = 'text', x = null, y = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionOverlay === index) {
      setActionOverlay(null);
    } else {
      const isUserMessage = messages[index].sender === 'User';
      const isThreeDots = e.target.closest('.message-options') !== null;
      console.log('Long press detected:', { index, type, x: e.clientX, y: e.clientY, isUserMessage, isThreeDots });
      setActionOverlay({ 
        index, 
        type, 
        clientX: e.clientX, 
        clientY: e.clientY, 
        isUserMessage, 
        isThreeDots 
      });
      setReactionOverlay(null);
    }
  };

  const handleReactionOverlay = (index) => {
    setReactionOverlay({
      index,
      clientX: actionOverlay.clientX,
      clientY: actionOverlay.clientY
    });
    setActionOverlay(null);
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
              onClick={() => handleImageClick(src)}
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
                    onClick={() => handleCopy(String(children).replace(/\n$/, ''))}
                  >
                    Copy
                  </button>
                </div>
              );
            } else {
              const inlineText = String(children).replace(/\n$/, '');
              return (
                <div className='inline-code-container'>
                  <code className='inline-code' {...props}>{children}</code>
                  {inlineText.split(' ').length > 1 && (
                    <button
                      className='copy-button inline-code-button'
                      onClick={() => handleCopy(inlineText)}
                    >
                      Copy
                    </button>
                  )}
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
          <img src='../logo512.png' alt='Ditto' className='avatar ditto-avatar' />
        )}
        <div
          className={`chat-bubble ${isUserMessage ? 'User' : 'Ditto'} ${
            actionOverlay && actionOverlay.index === index ? 'blurred' : ''
          } ${isSmallMessage ? 'small-message' : ''}`}
          style={bubbleStyles.chatbubble}
          onContextMenu={(e) => handleLongPress(e, index)}
        >
          {showSenderName && message.sender && <div className='sender-name'>{message.sender}</div>}
          <div className='message-text' style={bubbleStyles.text}>
            {renderMessageText(message.text, index)}
          </div>
          <div className='message-footer'>
            <div className='message-timestamp'>{formatTimestamp(message.timestamp)}</div>
            <div className='message-options' onClick={(e) => {
              const rect = e.currentTarget.closest('.chat-bubble').getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              handleLongPress(e, index, 'text', x, y);
            }}>
              <span>&#8942;</span>
            </div>
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
              position: 'fixed', // Change to 'fixed' positioning
              left: `${actionOverlay.clientX}px`, // Use clientX for absolute positioning
              top: `${actionOverlay.clientY}px`, // Use clientY for absolute positioning
              transform: 'translate(-50%, -50%)', // Center the overlay on the click position
            }}
          >
            {console.log('Rendering action overlay:', actionOverlay)}
            {actionOverlay.type === 'text' ? (
              <>
                <button onClick={() => handleCopy(message.text)} className='action-button'>
                  Copy
                </button>
                <button onClick={() => handleReactionOverlay(index)} className='action-button'>
                  React
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleImageOpen(message.text)} className='action-button'>
                  Open
                </button>
                <button onClick={async () => handleImageDownload(message.text)} className='action-button'>
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
