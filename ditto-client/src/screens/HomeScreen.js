import "./App.css";
import {
    Link,
} from "react-router-dom";
import Divider from '@mui/material/Divider';
import ChatBubbles from "../components/ChatBubbles";
import SendMessage from "../components/SendMessage";
import StatusBar from "../components/StatusBar";
import { FaUndo, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa'

export default function HomeScreen (props) {    

    var buttonSize = 25

    var statusColor = 'red' // default off
    if (props.status === 'on') {
        statusColor = 'green'
    }

    const handleMicPress = () => {

    }

    return (
        <div className='App'>
            <header className='App-header'>

                
                { props.microphone == 'on' ? (
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
                status={props.status} 
                statusColor={statusColor}
            />
            <Divider />
            <div className='App-body'>
                <ChatBubbles conv={props.conv}/>
            </div>
            <footer className='App-footer'>
                <SendMessage />
            </footer>
        </div>
    );
}
    