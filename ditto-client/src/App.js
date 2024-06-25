import React, { useState, useEffect } from "react";
import { grabConversationHistory, grabConversationHistoryCount } from "./models/api";
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

export default function App() {

    return (
        <HashRouter>
            <Redirect to='/' />
            <Switch>
                <Route exact path='/' component={HomeScreen} />
                <Route exact path='/SettingsScreen' component={SettingsScreen} />
                <Route exact path='/SignInScreen' component={SignInScreen} />
            </Switch>
        </HashRouter>
    );
}

