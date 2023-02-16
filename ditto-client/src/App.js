import React, {useState, useEffect} from "react";
import { grabConversationHistory, grabConversationHistoryCount } from "./models/api";
import { ChatFeed, Message } from "./modules/react-chat-ui-omar-fork/lib";
import { status } from "./models/Status";
import { grabStatus } from "./models/api";

import "./screens/App.css";
import {
    HashRouter,
    Redirect,
    Route, 
    Switch,
  } from "react-router-dom";
  
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from './screens/SettingsScreen';
import SignInScreen from './screens/SignInScreen';

export default function App () {

    var bubblefontSize = 14
    var bubblePadding = 10

    // First message from Ditto
    let conversation = {
        messages: [
            new Message({
            id: 1,
            message: "Hi! I'm Ditto."
            })
        ]
    };
    
    const [histCount, setCount] = useState(0)

    const [conv, setConversation] = useState(conversation)

    const [status, setStatus] = useState("off");

    const [microphoneStatus, setMicrophoneStatus] = useState("on")

    /**
     * Gets Conversation history count and updates if local count is different from Server database.
     */
    const syncConversationHist = async() => {
        let hasHistCount = window.electron.store.has('histCount')
        if (hasHistCount) { // If there is a local histCount variable, check if need to update from Server
            let serverHistCount = await grabConversationHistoryCount()
            let localHistCount = window.electron.store.get('histCount')
            if (serverHistCount===undefined || serverHistCount === localHistCount) {
                let localHist = getSavedConversation()
                createConversation(localHist, false)
                if (histCount !== localHistCount){
                    setCount(localHistCount)
                }
            } else { // update state from server
                let hist = await grabConversationHistory()
                try {
                    createConversation(hist, true)
                    let serverHistCount = await grabConversationHistoryCount() // grab histCount from Server database
                    if (histCount !== serverHistCount){
                        setCount(serverHistCount)
                    }
                    window.electron.store.set('histCount', histCount) // store histCount locally
                } catch (e) {
                    console.log(e)
                }
            }
        } else { // update state from server
            let hist = await grabConversationHistory()
            try {
                createConversation(hist, true)
                let serverHistCount = await grabConversationHistoryCount() // grab histCount from Server database
                if(histCount !== serverHistCount){
                    setCount(serverHistCount)
                }
                window.electron.store.set('histCount', histCount) // store histCount locally
            } catch (e) {
                console.log(e)
            }
        }
    }

    /**
     * Gets local electron-store cached conversation history.
     * @returns {prompts, responses} prompts and responses objects 
     */
    const getSavedConversation = () => {
    let prompts = JSON.parse(window.electron.store.get('prompts'))
    let responses = JSON.parse(window.electron.store.get('responses'))
    return {prompts, responses}
    }

    /**
     * Save updated history locally.
     */
    const handleSaveConversation = (hist) => {
    window.electron.store.set('prompts', JSON.stringify(hist.prompts));
    window.electron.store.set('responses', JSON.stringify(hist.responses));
    }

    /**
     * Creates renderable conversation history that updates the sate.
     * @param {*} hist conversation history response from API
     * @param save boolean to save locally or not
     */
    const createConversation = async(hist, save) => {
        if (save) {handleSaveConversation(hist)}
        let prompts = hist.prompts
        let responses = hist.responses
        for (var key in prompts) {
            if (prompts.hasOwnProperty(key)) {
                let prompt = prompts[key]
                let response = responses[key]
                // console.log(prompt, response)
                conversation.messages.push(
                    new Message({
                    id: 0,
                    message: prompt
                    })
                )
                conversation.messages.push(
                    new Message({
                    id: 1,
                    message: response
                    })
                )
            }
        }
        // if (conv.messages.length !== conversation.messages.length){
            setConversation(conversation)
        // }
    }

    const handleStatus = async() => {
        var statusDb = await grabStatus()
        if (status !== statusDb.status) {
            setStatus(statusDb.status)
        }
    }

    useEffect(() => {

        // used for resizing bubbles and font size with window
        function handleResize() {
            var x = window.innerWidth
            var y = window.innerHeight
            if (x > 600 && y > 700) {
            bubblefontSize = 25
            bubblePadding = 20
            } else {
            bubblefontSize = 14
            bubblePadding = 10
            }
        }

        handleResize() // apply size rules on render
        
        window.addEventListener('resize', handleResize)
        // setInterval(async() => {
            setTimeout(async() => {
            try {
                await handleStatus()
                await syncConversationHist()
            } catch (e) {
                console.log(e)
            }
            }, 1000)
        // }, 300)
    }, [conv, status, histCount])

    return (
        <HashRouter>
            <Redirect to='/' />
            <Switch>
                <Route exact path='/' render = {(props) => 
                    <HomeScreen 
                        {...props} 
                        conv={conv} 
                        status={status} 
                        microphone={microphoneStatus}
                    />
                }/>
                <Route exact path='/SettingsScreen' component={SettingsScreen} />
                <Route exact path='/SignInScreen' component={SignInScreen} />
            </Switch>
        </HashRouter>
    );
}
    
