import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../control/firebase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import './ChatFeed.css';

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
      let posX, posY;
      if (x !== null && y !== null) {
        posX = x;
        posY = y;
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        posX = e.clientX - rect.left;
        posY = e.clientY - rect.top;
      }
      setActionOverlay({ index, type, x: posX, y: posY });
      setReactionOverlay(null);
    }
  };

  const handleReactionOverlay = (index) => {
    setReactionOverlay(index);
    setActionOverlay(null);
  };

  const handleImageOpen = (messageText) => {
    window.open(messageText.match(/\(([^)]+)\)/)[1], '_blank');
    setActionOverlay(null);
  };

  const handleImageDownload = async (messageText) => {
    window.open(messageText.match(/\(([^)]+)\)/)[1], '_blank');
    setActionOverlay(null);
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
              onClick={(e) => handleLongPress(e, index, 'image')}
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

    return (
      <div
        key={index}
        className={`message-container ${message.sender === 'User' ? 'User' : 'Ditto'}`}
      >
        {message.sender === 'Ditto' && (
          <img src='../logo512.png' alt='Ditto' className='avatar ditto-avatar' />
        )}
        <div
          className={`chat-bubble ${message.sender === 'User' ? 'User' : 'Ditto'} ${
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
              left: `${actionOverlay.x}px`,
              top: `${actionOverlay.y}px`,
            }}
          >
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
