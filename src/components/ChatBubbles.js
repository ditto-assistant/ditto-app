import React from "react";
import ChatFeed from "./ChatFeed";

const bubblefontSize = 14;
const bubblePadding = 15;

export default function ChatBubbles(props) {
  return (
    <div>
      <ChatFeed
        messages={props.conversation.messages} // List of message objects
        histCount={props.histCount}
        isTyping={props.conversation.is_typing} // Boolean: is the recipient typing
        hasInputField={false} // Boolean: use our input, or use your own
        showSenderName={false} // show the name of the user who sent the message
        bubblesCentered={false} // Boolean: should the bubbles be centered in the feed?
        scrollToBottom={true} // Boolean: should scroll to bottom
        // JSON: Custom bubble styles
        bubbleStyles={{
          text: {
            fontSize: bubblefontSize,
            color: "#000000", // Ensure text color is black
          },
          chatbubble: {
            borderRadius: 60,
            padding: bubblePadding,
          },
        }}
      />
    </div>
  );
}
