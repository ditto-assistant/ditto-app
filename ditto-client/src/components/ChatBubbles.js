import React, {useState, useEffect} from "react";
import { ChatFeed, Message } from "../modules/react-chat-ui-omar-fork"; // changed bubble style a bit
import { grabConversationHistory, grabConversationHistoryCount } from "../models/api";

var bubblefontSize = 14
var bubblePadding = 10

export default function ChatBubble(props) {

    // // First message from Ditto
    // let conversation = {
    //   messages: [
    //     new Message({
    //       id: 1,
    //       message: "Hi! I'm Ditto."
    //     })
    //   ]
    // };

    // const [histCount, setCount] = useState(0) 

    // const [conv, setConversation] = useState(conversation)

    // /**
    //  * Gets Conversation history count and updates if local count is different from Server database.
    //  */
    // const syncConversationHist = async() => {
    //   let hasHistCount = window.electron.store.has('histCount')
    //   if (hasHistCount) { // If there is a local histCount variable, check if need to update from Server
    //     let serverHistCount = await grabConversationHistoryCount()
    //     let localHistCount = window.electron.store.get('histCount')
    //     if (serverHistCount===undefined || serverHistCount.historyCount === localHistCount.historyCount) {
    //       let localHist = getSavedConversation()
    //       createConversation(localHist, false)
    //       if (histCount === 0){setCount(localHistCount)}
    //     } else { // update state from server
    //       let hist = await grabConversationHistory()
    //       try {
    //         createConversation(hist, true)
    //         let histCount = await grabConversationHistoryCount() // grab histCount from Server database
    //         setCount(histCount)
    //         window.electron.store.set('histCount', histCount) // store histCount locally
    //       } catch (e) {
    //         console.log(e)
    //       }
    //     }
    //   } else { // update state from server
    //     let hist = await grabConversationHistory()
    //     try {
    //       createConversation(hist, true)
    //       let histCount = await grabConversationHistoryCount() // grab histCount from Server database
    //       setCount(histCount)
    //       window.electron.store.set('histCount', histCount) // store histCount locally
    //     } catch (e) {
    //       console.log(e)
    //     }
    //   }
    // }

    // /**
    //  * Gets local electron-store cached conversation history.
    //  * @returns {prompts, responses} prompts and responses objects 
    //  */
    // const getSavedConversation = () => {
    //   let prompts = JSON.parse(window.electron.store.get('prompts'))
    //   let responses = JSON.parse(window.electron.store.get('responses'))
    //   return {prompts, responses}
    // }

    // /**
    //  * Save updated history locally.
    //  */
    // const handleSaveConversation = (hist) => {
    //   window.electron.store.set('prompts', JSON.stringify(hist.prompts));
    //   window.electron.store.set('responses', JSON.stringify(hist.responses));
    // }

    // /**
    //  * Creates renderable conversation history that updates the sate.
    //  * @param {*} hist conversation history response from API
    //  * @param save boolean to save locally or not
    //  */
    // const createConversation = async(hist, save) => {
    //   if (save) {handleSaveConversation(hist)}
    //   let prompts = hist.prompts
    //   let responses = hist.responses
    //   for (var key in prompts) {
    //     if (prompts.hasOwnProperty(key)) {
    //       let prompt = prompts[key]
    //       let response = responses[key]
    //       // console.log(prompt, response)
    //       conversation.messages.push(
    //         new Message({
    //           id: 0,
    //           message: prompt
    //         })
    //       )
    //       conversation.messages.push(
    //         new Message({
    //           id: 1,
    //           message: response
    //         })
    //       )
    //     }
    //   }
    //   setConversation(conversation)
    // }

    // useEffect(() => {

    //   // used for resizing bubbles and font size with window
    //   function handleResize() {
    //     var x = window.innerWidth
    //     var y = window.innerHeight
    //     if (x > 600 && y > 700) {
    //       bubblefontSize = 25
    //       bubblePadding = 20
    //     } else {
    //       bubblefontSize = 14
    //       bubblePadding = 10
    //     }
    //   }
    //   handleResize() // apply size rules on render
    //   window.addEventListener('resize', handleResize)

    //   setTimeout(async() => {
    //     syncConversationHist()
    //   }, 1000)
    // }, [histCount, conversation])
    
    return (
      <ChatFeed
        messages={props.conv.messages} // Boolean: list of message objects
        isTyping={props.conv.is_typing} // Boolean: is the recipient typing
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
    );
  }
