import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import HomeScreen from "./screens/HomeScreen";
import ScriptsScreen from "./screens/ScriptsScreen";
import DittoCanvas from "./screens/DittoCanvas";
import Settings from './screens/settings';
import Paypal from "./screens/paypal";
import Login from './screens/login';
import AuthenticatedRoute from './components/AuthenticatedRoute'; // Ensure you import the HOC

localStorage.removeItem("openai_api_key")

export default function App() {

    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={
                    <AuthenticatedRoute>
                        <HomeScreen />
                    </AuthenticatedRoute>
                } />
                <Route path="/settings" element={
                    <AuthenticatedRoute>
                        <Settings />
                    </AuthenticatedRoute>
                } />
                <Route path="/paypal" element={
                    <AuthenticatedRoute>
                        <Paypal />
                    </AuthenticatedRoute>
                } />
                <Route path="/scripts" element={
                    <AuthenticatedRoute>
                        <ScriptsScreen />
                    </AuthenticatedRoute>
                } />
                <Route path="/canvas" element={
                    <AuthenticatedRoute>
                        <DittoCanvas />
                    </AuthenticatedRoute>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </HashRouter>
    );
}
