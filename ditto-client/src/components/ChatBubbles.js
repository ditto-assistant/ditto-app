import React, {useState, useEffect, useRef} from "react";
import { ChatFeed, Message } from "../modules/react-chat-ui-omar-fork"; // changed bubble style a bit
import { grabConversationHistory, grabConversationHistoryCount } from "../models/api";

var bubblefontSize = 14
var bubblePadding = 10

export default function ChatBubble(props) {
  
  return (
    <div>
      <ChatFeed
        messages={props.conversation.messages} // Boolean: list of message objects
        isTyping={props.conversation.is_typing} // Boolean: is the recipient typing
        hasInputField={false} // Boolean: use our input, or use your own
        showSenderName // show the name of the user who sent the message
        bubblesCentered={false} //Boolean should the bubbles be centered in the feed?
        scrollToBottom={false}
        
        // JSON: Custom bubble styles
        bubbleStyles={{
          text: {
            fontSize: bubblefontSize
          },
          chatbubble: {
            borderRadius: 60,
            padding: bubblePadding
          }
        }}
      />
    </div>
  );
}
