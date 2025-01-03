import React, { useState } from "react";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import { FiCopy } from "react-icons/fi";
import PropTypes from "prop-types";

const ChatMessage = ({
  message,
  index,
  isLastMessage,
  dittoAvatar,
  userAvatar,
  isLastDittoMessage,
  onBubbleInteraction,
  reactions,
  actionOverlay,
  handleCopy,
  bubbleStyles,
}) => {
  const [copied, setCopied] = useState(false);

  const renderMessageText = (text) => {
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
                e.stopPropagation();
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

  const isUserMessage = message.sender === "User";
  const isSmallMessage = message.text.length <= 5;
  const showTypingIndicator = message.isTyping && message.text === "";
  const isGenerating = message.sender === "Ditto" && message.isTyping;

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
          style={bubbleStyles?.chatbubble}
          onClick={(e) => onBubbleInteraction(e, index)}
          onContextMenu={(e) => onBubbleInteraction(e, index)}
          data-index={index}
        >
          {message.toolType && (
            <div className={`tool-badge ${message.toolType.toLowerCase()}`}>
              {message.toolType.toUpperCase()}
            </div>
          )}

          <div className="message-text" style={bubbleStyles?.text}>
            {message.toolStatus && message.toolType ? (
              <>
                {renderMessageText(message.text)}
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
              renderMessageText(message.text)
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
        <img src={userAvatar} alt="User" className="avatar user-avatar" />
      )}
    </motion.div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    sender: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    timestamp: PropTypes.number,
    pairID: PropTypes.string,
    isTyping: PropTypes.bool,
    toolType: PropTypes.string,
    toolStatus: PropTypes.string,
    showTypingDots: PropTypes.bool,
  }).isRequired,
  index: PropTypes.number.isRequired,
  isLastMessage: PropTypes.bool.isRequired,
  dittoAvatar: PropTypes.string.isRequired,
  userAvatar: PropTypes.string.isRequired,
  isLastDittoMessage: PropTypes.bool.isRequired,
  onBubbleInteraction: PropTypes.func.isRequired,
  reactions: PropTypes.object.isRequired,
  actionOverlay: PropTypes.object,
  handleCopy: PropTypes.func.isRequired,
  bubbleStyles: PropTypes.shape({
    text: PropTypes.object,
    chatbubble: PropTypes.object,
  }),
};

export default React.memo(ChatMessage);
