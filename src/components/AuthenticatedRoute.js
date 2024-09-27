import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const AuthenticatedRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div></div>; // Or any loading indicator
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default AuthenticatedRoute;
