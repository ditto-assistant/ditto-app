import React from 'react';
import './ChatFeed.css';

const ChatFeed = () => {
  // Sample messages data
  const messages = [
    { id: 1, type: 'Ditto', text: 'Thanks for your message!' },
    { id: 2, type: 'User', text: 'drsretsrehrt' },
    { id: 3, type: 'Ditto', text: 'Thanks for your message!' },
    { id: 4, type: 'User', text: 'sdsdfdsf' },
    { id: 5, type: 'Ditto', text: 'Thanks for your message!' },
    { id: 6, type: 'User', text: 'sdsdfsdsdf' },
    // ... more messages
  ];

  // Group messages by sender and time
  const groupMessages = (messages) => {
    return messages.reduce((groups, message) => {
      const lastGroup = groups[groups.length - 1];
      
      if (lastGroup && lastGroup.type === message.type) {
        lastGroup.messages.push(message);
      } else {
        groups.push({
          type: message.type,
          messages: [message]
        });
      }
      
      return groups;
    }, []);
  };

  return (
    <div className="container">
      {/* Main chat container with gradient background */}
      <div className="chat-feed">
        {/* Optional: Add a header section */}
        <div className="header">
          <h1>Chat</h1>
        </div>

        {/* Messages container */}
        <div className="messages-wrapper" style={{ 
          padding: '16px 0', 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px' // Consistent spacing between message groups
        }}>
          {groupMessages(messages).map((group, groupIndex) => (
            <div key={groupIndex} style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '2px' // Tighter spacing within groups
            }}>
              {group.messages.map((message) => (
                <div key={message.id} className={`message-container ${message.type}`}>
                  <div className={`chat-bubble ${message.type}`}>
                    <div className="message-text">{message.text}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Background effects */}
        <div className="background-animation">
          <div className="particle"></div>
        </div>
      </div>
    </div>
  );
};

export default ChatFeed;
