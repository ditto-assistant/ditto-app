import { Suspense, createContext, useContext, lazy } from "react";
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Outlet } from "react-router-dom";

import AuthenticatedRoute from './components/AuthenticatedRoute';
import { useBalance } from './api/useBalance';
import Login from './screens/login';

// Lazy load components
const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const ScriptsScreen = lazy(() => import("./screens/ScriptsScreen"));
const DittoCanvas = lazy(() => import("./screens/DittoCanvas"));
const Settings = lazy(() => import('./screens/settings'));
const Paypal = lazy(() => import("./screens/paypal"));

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
                        <Suspense fallback={<div>Loading Page...</div>}>
                            <Outlet />
                        </Suspense>
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
        <Suspense fallback={<div>Loading Router...</div>}>
            <RouterProvider router={router} />
        </Suspense>
    );
}
