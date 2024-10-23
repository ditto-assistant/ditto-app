import React from "react";
import { Navigate } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../hooks/useAuth";

const AuthenticatedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
        return <LoadingSpinner text="Logging In..." />;
    }
    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default AuthenticatedRoute;
