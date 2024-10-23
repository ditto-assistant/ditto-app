import React, { Suspense, createContext, useContext, lazy, useState, useEffect } from "react";
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Outlet } from "react-router-dom";
import LoadingSpinner from "./components/LoadingSpinner";
import AuthenticatedRoute from './components/AuthenticatedRoute';
import { useBalance } from './api/useBalance';
import Login from './screens/login';
import HeyDitto from './ditto/activation/heyDitto';

// Lazy load components
const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const ScriptsScreen = lazy(() => import("./screens/ScriptsScreen"));
const DittoCanvas = lazy(() => import("./screens/DittoCanvas"));
const Settings = lazy(() => import('./screens/settings'));
const Paypal = lazy(() => import("./screens/paypal"));

const BalanceContext = createContext();
const DittoActivationContext = createContext();

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
    return (
        <BalanceContext.Provider value={{ balance: ok?.balance, images: ok?.images, loading, error, refetch }}>
            {children}
        </BalanceContext.Provider>
    );
}

function DittoActivationProvider({ children }) {
    const [DittoActivation] = useState(() => new HeyDitto());
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        DittoActivation.loadModel().then(() => { setIsLoaded(true); });
    }, [DittoActivation]);

    return (
        <DittoActivationContext.Provider value={{ isLoaded, model: DittoActivation }}>
            {children}
        </DittoActivationContext.Provider>
    );
}

/**
 * Custom hook to access the DittoActivation context.
 * 
 * @returns {{isLoaded: boolean, model: HeyDitto}} An object containing:
 *   - isLoaded: A boolean indicating whether the DittoActivation model has finished loading.
 *   - model: The HeyDitto instance for voice activation.
 * @throws {Error} Throws an error if used outside of a DittoActivationProvider.
 */
export function useDittoActivation() {
    const context = useContext(DittoActivationContext);
    if (context === undefined) {
        throw new Error('useDittoActivation must be used within a DittoActivationProvider');
    }
    return context;
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/">
            <Route path="login" element={<Login />} />
            <Route element={
                <AuthenticatedRoute>
                    <BalanceProvider>
                        <Suspense fallback={<LoadingSpinner />}>
                            <Outlet />
                        </Suspense>
                    </BalanceProvider>
                </AuthenticatedRoute>
            }>
                <Route index element={
                    <DittoActivationProvider>
                        <HomeScreen />
                    </DittoActivationProvider>
                } />
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
        <Suspense fallback={<LoadingSpinner />}>
            <RouterProvider router={router} />
        </Suspense>
    );
}
