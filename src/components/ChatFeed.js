import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatFeed.css';

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
      borderRadius: 50,
      padding: 15,
    },
  },
}) {
  const [copied, setCopied] = useState(false);
  const feedRef = useRef(null);
  const bottomRef = useRef(null); // Reference to the bottom div

  const scrollToBottomOfFeed = (quick=false) => {
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
        }, 500); // Provide enough time to ensure DOM elements are rendered
        // Clean up timeout on unmount
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, scrollToBottom]); // Trigger when messages change or scrollToBottom is true

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Hide "copied" message after 2 seconds
  };

  const renderMessageText = (text) => {
    // clean up code blocks that have ```scriptname with text on the same line by
    // putting a new line after all ```scriptname occurrences with ```scriptname\n
    text = text.replace(/```[a-zA-Z0-9]+/g, (match) => `\n${match}`);
    // now replace all instances of ```. with ```\n.
    text = text.replace(/```\./g, '```\n');
    return (
    <ReactMarkdown
      children={text}
      components={{
        img: (props) => <img {...props} className='chat-image' alt='' style={{ width: '95%', height: '95%', paddingTop: '4px' }} />,
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
    />);
  };

  return (
    <div className='chat-feed' ref={feedRef}>
      {messages.map((message, index) => (
        <div
          key={index}
          className={`chat-bubble ${message.sender === 'User' ? 'User' : 'Ditto'}`}
          style={bubbleStyles.chatbubble}
        >
          {showSenderName && message.sender && <div className='sender-name'>{message.sender}</div>}
          <div className='message-text' style={bubbleStyles.text}>
            {renderMessageText(message.text)}
          </div>
        </div>
      ))}
      {isTyping && (
        <div className='typing-indicator'>
          <div className='typing-dot' style={{ '--i': 0 }} />
          <div className='typing-dot' style={{ '--i': 1 }} />
          <div className='typing-dot' style={{ '--i': 2 }} />
        </div>
      )}
      {hasInputField && <input type='text' className='chat-input-field' />}
      {copied && <div className='copied-notification'>Copied to clipboard!</div>}
      <div ref={bottomRef} /> {/* Bottom reference for smooth scrolling */}
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