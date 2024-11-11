import { createContext, useState, useContext, useEffect } from "react";
import { auth } from "../control/firebase";

const AuthContext = createContext();

/**
 * Access the authentication state.
 *
 * This hook provides the current authentication state of the user,
 * including whether the auth state is still loading and if the user
 * is authenticated. It also provides a signOut function.
 *
 * @returns {{
 *   user?: import("@firebase/auth").User,
 *   loading: boolean,
 *   error?: Error,
 *   signOut: () => Promise<void>
 * }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Access the authentication token.
 *
 * This hook provides the current authentication token of the user,
 * including whether the token is still loading and if there is an error.
 *
 * @returns {{
 *   token: string | undefined,
 *   error: Error | undefined
 * }}
 */
export const useAuthToken = () => {
  const auth = useAuth();
  const [token, setToken] = useState(undefined);
  const [error, setError] = useState(undefined);
  useEffect(() => {
    auth.user?.getIdToken().then(setToken, setError);
  }, [auth.user]);
  return { token, error };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const signOut = () => auth.signOut();

  const value = {
    user,
    loading,
    error,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
