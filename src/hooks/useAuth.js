import { useState, useEffect } from "react";
import { auth } from "../control/firebase";
import { onAuthStateChanged } from "firebase/auth";

const AUTH_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Custom hook for managing authentication state.
 * 
 * This hook provides the current authentication state of the user,
 * including whether the auth state is still loading and if the user
 * is authenticated. It also provides a signOut function.
 * 
 * The hook uses Firebase Authentication and local storage to persist
 * the auth state across page reloads, while ensuring proper behavior
 * during sign-in and sign-out.
 * 
 * @returns {{loading: boolean, isAuthenticated: boolean, signOut: () => Promise<void>}}
 */
export const useAuth = () => {
    const [authState, setAuthState] = useState(() => {
        const cachedState = localStorage.getItem('authState');
        if (cachedState) {
            const { state, expiry } = JSON.parse(cachedState);
            if (Date.now() < expiry) {
                return state;
            }
        }
        return { loading: true, isAuthenticated: false };
    });

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            const newState = { loading: false, isAuthenticated: !!user };
            setAuthState(newState);
            localStorage.setItem('authState', JSON.stringify({
                state: newState,
                expiry: Date.now() + AUTH_EXPIRY_TIME
            }));
        });

        return () => unsubscribe();
    }, []);

    const signOut = () => {
        auth.signOut().then(() => {
            const newState = { loading: false, isAuthenticated: false };
            setAuthState(newState);
            localStorage.removeItem('authState');
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    };

    return { ...authState, signOut };
};
