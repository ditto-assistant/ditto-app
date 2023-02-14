import "./App.css";
import {
    Link,
} from "react-router-dom";
import Divider from '@mui/material/Divider';
import ChatBubbles from "../components/ChatBubbles";
import SendMessage from "../components/SendMessage";
import StatusBar from "../components/StatusBar";


export default function HomeScreen (props) {    

    return (
        <div className='App'>
            <header className='App-header'>
                <h2>Ditto Dashboard</h2>
            </header>
            <Divider />
            <StatusBar status={props.status}/>
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
    