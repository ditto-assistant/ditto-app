import { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Outlet } from "react-router-dom";
import LoadingSpinner from "./components/LoadingSpinner";
import AuthenticatedRoute from './components/AuthenticatedRoute';
import { AuthProvider } from './hooks/useAuth';
import { BalanceProvider } from './hooks/useBalance';
import { DittoActivationProvider } from './hooks/useDittoActivation';
import { IntentRecognitionProvider } from "./hooks/useIntentRecognition";
import Login from './screens/login';

// Lazy load components
const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const ScriptsScreen = lazy(() => import("./screens/ScriptsScreen"));
const DittoCanvas = lazy(() => import("./screens/DittoCanvas"));
const Settings = lazy(() => import('./screens/settings'));
const Paypal = lazy(() => import("./screens/paypal"));

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/">
            <Route path="login" element={<Login />} />
            <Route element={
                <Suspense fallback={<LoadingSpinner />}>
                    <AuthenticatedRoute>
                        <Outlet />
                    </AuthenticatedRoute>
                </Suspense>
            }>
                <Route index element={
                    <HomeScreen />
                } />
                <Route path="settings" element={<Settings />} />
                <Route path="paypal" element={<Paypal />} />
                <Route path="scripts" element={<ScriptsScreen />} />
                <Route path="canvas" element={<DittoCanvas />} />
            </Route >
        </Route >
    )
);

export default function App() {
    return (
        <AuthProvider>
            <IntentRecognitionProvider>
                <DittoActivationProvider>
                    <BalanceProvider>
                        <RouterProvider router={router} />
                    </BalanceProvider>
                </DittoActivationProvider>
            </IntentRecognitionProvider>
        </AuthProvider>
    );
}
