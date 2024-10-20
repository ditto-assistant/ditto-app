import { Suspense, createContext, useContext } from "react";
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Outlet } from "react-router-dom";

import HomeScreen from "./screens/HomeScreen";
import ScriptsScreen from "./screens/ScriptsScreen";
import DittoCanvas from "./screens/DittoCanvas";
import Settings from './screens/settings';
import Paypal from "./screens/paypal";
import Login from './screens/login';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import { useBalance } from './api/useBalance';

const BalanceContext = createContext();

/**
 * Custom hook to access the balance context.
 * 
 * @returns {{balance: string, images: string, refetch: (() => void)}} The balance object containing the user's balance and available images, and a function to refetch the balance.
 * @throws {Error} Throws an error if used outside of a BalanceProvider.
 */
export function useBalanceContext() {
    const context = useContext(BalanceContext);
    if (context === undefined) {
        throw new Error('useBalanceContext must be used within a BalanceProvider');
    }
    return context;
}

function BalanceProvider({ children }) {
    const { ok, error, loading, refetch } = useBalance();
    if (loading) {
        return <div>Loading balance...</div>;
    }
    if (error) {
        console.error("Error fetching balance:", error);
        return <div>Error loading balance. Please try again.</div>;
    }
    return (
        <BalanceContext.Provider value={{ balance: ok.balance, images: ok.images, refetch }}>
            {children}
        </BalanceContext.Provider>
    );
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/">
            <Route path="login" element={<Login />} />
            <Route element={
                <AuthenticatedRoute>
                    <BalanceProvider>
                        <Outlet />
                    </BalanceProvider>
                </AuthenticatedRoute>
            }>
                <Route index element={<HomeScreen />} />
                <Route path="settings" element={<Settings />} />
                <Route path="paypal" element={<Paypal />} />
                <Route path="scripts" element={<ScriptsScreen />} />
                <Route path="canvas" element={<DittoCanvas />} />
            </Route>
        </Route>
    )
);

export default function App() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RouterProvider router={router} />
        </Suspense>
    );
}
