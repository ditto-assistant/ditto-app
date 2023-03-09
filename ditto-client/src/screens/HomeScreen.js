import "./App.css";
import React, {useState, useEffect, useRef} from "react";
import { grabConversationHistory, grabConversationHistoryCount } from "../models/api";
import { ChatFeed, Message } from "../modules/react-chat-ui-omar-fork/lib";
import { status } from "../models/Status";
import { grabStatus } from "../models/api";
import Divider from '@mui/material/Divider';
import ChatBubbles from "../components/ChatBubbles";
import SendMessage from "../components/SendMessage";
import StatusBar from "../components/StatusBar";
import { FaUndo, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa'

export default function HomeScreen () {    

    const [bootStatus, setBootStatus] = useState("off");
    
    const [histCount, setCount] = useState(0)

    const [conversation, setConversation] = useState({
        messages: [
            new Message({
            id: 1,
            message: "Hi! I'm Ditto."
            })
        ]
    })

    const [microphoneStatus, setMicrophoneStatus] = useState("on")

    let buttonSize = 25

    const handleMicPress = () => {

    }

    const bottomRef = useRef(null);

    let bubblefontSize = 14
    let bubblePadding = 10

    /**
     * Gets Conversation history count and updates if local count is different from Server database.
     */

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
        let histSize = Object.keys(prompts).length + Object.keys(responses).length
        let newConversation = {
            messages: [
                new Message({
                id: 1,
                message: "Hi! I'm Ditto."
                })
            ]
        }
        for (var key in prompts) {
            let prompt = prompts[key]
            let response = responses[key]
            // console.log(prompt, response)
            newConversation.messages.push(
                new Message({
                id: 0,
                message: prompt
                })
            )
            newConversation.messages.push(
                new Message({
                id: 1,
                message: response
                })
            )
        setConversation(newConversation)
        }
    }

    useEffect(() => {

        const handleStatus = async() => {
            var statusDb = await grabStatus()
            if (bootStatus !== statusDb.status) {
                setBootStatus(statusDb.status)
            }
        }

        const syncConversationHist = async() => {
            let hasHistCount = window.electron.store.has('histCount')
            let serverHistCount = await grabConversationHistoryCount()
            let localHistCount = window.electron.store.get('histCount')
            if (hasHistCount) { // If there is a local histCount variable, check if need to update from Server
                console.log(serverHistCount, localHistCount)
                let localHist = getSavedConversation()
                if (histCount !== localHistCount){
                    setCount(localHistCount)
                }
                createConversation(localHist, false)
            }
            if (serverHistCount !== localHistCount) {
                try {
                    let hist = await grabConversationHistory()
                    if (histCount !== serverHistCount){
                        setCount(serverHistCount)
                    }
                    createConversation(hist, true)
                    window.electron.store.set('histCount', serverHistCount) // store histCount locally
                    // console.log(serverHistCount, histCount)
                } catch (e) {
                    console.log(e)
                }
            }
        }
    
        // function handleResize() {
        //     var x = window.innerWidth
        //     var y = window.innerHeight
        //     if (x > 600 && y > 700) {
        //     bubblefontSize = 25
        //     bubblePadding = 20
        //     } else {
        //     bubblefontSize = 14
        //     bubblePadding = 10
        //     }
        // }

        // handleResize() // apply size rules on render
        
        // window.addEventListener('resize', handleResize)

        

        const syncInterval = setInterval(async() => {

            try {
                await handleStatus()
                await syncConversationHist()
            } catch (e) {
                console.log(e)
            }

        }, 1000)

        // run when unmounted
        return () => clearInterval(syncInterval) // fixes memory leak 

    }, [])

    const statusColor = bootStatus === 'on' ? 'green' : 'red'

    useEffect(() => {
        // 👇️ scroll to bottom every time messages change
        bottomRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [histCount]);
    

    return (
        <div className='App'>
            <header className='App-header'>
                
                { microphoneStatus === 'on' ? (
                    <FaMicrophone style = {{
                        paddingLeft: 20, 
                        color: 'green', 
                        width: buttonSize, 
                        height:buttonSize
                    }}/>
                ) :
                    <FaMicrophoneSlash style = {{
                        paddingLeft: 20, 
                        color: 'red', 
                        width: buttonSize, 
                        height:buttonSize
                    }}/>
                }
                <h2>Ditto Dashboard</h2>
                <FaUndo style = {{
                    "paddingRight": 20, 
                    width:buttonSize, 
                    height:buttonSize,
                    color: 'white'
                }}/>
            </header>
            <Divider />
            <StatusBar 
                status={bootStatus} 
                statusColor={statusColor}
            />
            <Divider />
            <div className='App-body'>
                <ChatBubbles conversation={conversation}/>
                <div ref={bottomRef} />
            </div>
            
            <footer className='App-footer'>
                <SendMessage />
            </footer>
            
        </div>
    );
}
    