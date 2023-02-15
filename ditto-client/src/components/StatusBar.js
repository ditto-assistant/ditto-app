/**
 * Send button and form for sending Ditto a message.
 */
import './StatusBar.css'
import React, {useState, useEffect} from "react";
import { statusTemp } from "../models/Status";
import { grabStatus } from "../models/api";

export default function StatusBar(props) {    

    return (
        <div className='StatusBar' >
            <div className='Status'>
                <p className='Status-text'>Status:</p>
                <p className='Status-indicator' style={{"color": props.statusColor}}>{props.status}</p>
            </div>
            <div className='Status'>
                <p className='Status-text'>Volume:</p>
                <p className='Status-indicator'>{statusTemp.volume}</p>
            </div>
        </div>
    );
}