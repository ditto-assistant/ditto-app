import { createContext, useState, useContext, useEffect } from 'react';
import { auth } from "../control/firebase";

/**
 * Access the authentication state.
 * 
 * This hook provides the current authentication state of the user,
 * including whether the auth state is still loading and if the user
 * is authenticated. It also provides a signOut function.
 * 
 * The hook uses Firebase Authentication and local storage to persist
 * the auth state across page reloads, while ensuring proper behavior
 * during sign-in and sign-out.
 * 
 * @returns {{loading: boolean, isAuthenticated: boolean, signOut: () => Promise<void>, auth: import("@firebase/auth").Auth}}
 */
export const useAuth = () => useContext(AuthContext);

const AUTH_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(() => {
        const cachedState = localStorage.getItem('authState');
        if (cachedState) {
            const { state, expiry } = JSON.parse(cachedState);
            if (Date.now() < expiry) {
                return { ...state, loading: false };
            }
        }
        return { loading: true, isAuthenticated: false };
    });

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            const newState = { loading: false, isAuthenticated: !!user };
            setAuthState(newState);
            if (user) {
                localStorage.setItem('authState', JSON.stringify({
                    state: newState,
                    expiry: Date.now() + AUTH_EXPIRY_TIME
                }));
            } else {
                localStorage.removeItem('authState');
            }
        });

        return () => unsubscribe();
    }, []);

    const signOut = () => {
        return auth.signOut().then(() => {
            localStorage.removeItem('authState');
            setAuthState({ loading: false, isAuthenticated: false });
        });
    };

    const value = {
        ...authState,
        signOut,
        auth
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};