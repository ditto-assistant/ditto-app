import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import './ChatFeed.css';

export default function ChatFeed({ messages, histCount, isTyping, hasInputField, showSenderName, bubblesCentered, scrollToBottom, bubbleStyles }) {
  const feedRef = useRef(null);

  useEffect(() => {
    if (scrollToBottom) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [histCount, scrollToBottom]);

  const renderMessageText = (text) => {
    // Replace newlines with <br /> tags
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        <ReactMarkdown>{line}</ReactMarkdown>
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="chat-feed" ref={feedRef}>
      {messages.map((message, index) => (
        <div key={index} className={`chat-bubble ${message.sender === 'User' ? 'User' : 'Ditto'}`} style={bubbleStyles.chatbubble}>
          {showSenderName && message.sender && <div className="sender-name">{message.sender}</div>}
          <div className="message-text" style={bubbleStyles.text}>
            {renderMessageText(message.text)}
          </div>
        </div>
      ))}
      {isTyping && <div className="typing-indicator">Someone is typing...</div>}
      {hasInputField && <input type="text" className="chat-input-field" />}
    </div>
  );
}

ChatFeed.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string,
      text: PropTypes.string.isRequired,
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

ChatFeed.defaultProps = {
  isTyping: false,
  hasInputField: false,
  showSenderName: true,
  bubblesCentered: false,
  scrollToBottom: false,
  bubbleStyles: {
    text: {
      fontSize: 14,
    },
    chatbubble: {
      borderRadius: 60,
      padding: 10,
    },
  },
};