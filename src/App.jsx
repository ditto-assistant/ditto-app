import { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import FullScreenSpinner from "./components/LoadingSpinner";
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import { AuthProvider } from "./hooks/useAuth";
import { BalanceProvider } from "./hooks/useBalance";
import { DittoActivationProvider } from "./hooks/useDittoActivation";
import { IntentRecognitionProvider } from "./hooks/useIntentRecognition";
import Login from "./screens/login";
import { MemoryCountProvider } from "./hooks/useMemoryCount";
import { PresignedUrlProvider } from "./hooks/usePresignedUrls";
import { ModelPreferencesProvider } from "./hooks/useModelPreferences";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Lazy load components
const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const ScriptsScreen = lazy(() => import("./screens/ScriptsScreen"));
const DittoCanvas = lazy(() => import("./screens/DittoCanvas"));
const Settings = lazy(() => import("./screens/settings"));
const Checkout = lazy(() => import("./screens/checkout"));
const CheckoutSuccess = lazy(() => import("./screens/checkoutSuccess"));

// Create a QueryClient instance
const queryClient = new QueryClient();

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/">
      <Route path="login" element={<Login />} />
      <Route
        element={
          <Suspense fallback={<FullScreenSpinner />}>
            <AuthenticatedRoute>
              <Outlet />
            </AuthenticatedRoute>
          </Suspense>
        }
      >
        <Route index element={<HomeScreen />} />
        <Route path="settings" element={<Settings />} />
        <Route path="scripts" element={<ScriptsScreen />} />
        <Route path="canvas" element={<DittoCanvas />} />
        <Route path="checkout">
          <Route index element={<Checkout />} />
          <Route path="success" element={<CheckoutSuccess />} />
        </Route>
      </Route>
    </Route>
  )
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BalanceProvider>
          <ModelPreferencesProvider>
            <MemoryCountProvider>
              <IntentRecognitionProvider>
                <DittoActivationProvider>
                  <PresignedUrlProvider>
                    <RouterProvider router={router} />
                    <Toaster
                      position="bottom-center"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: "#333",
                          color: "#fff",
                        },
                      }}
                    />
                  </PresignedUrlProvider>
                </DittoActivationProvider>
              </IntentRecognitionProvider>
            </MemoryCountProvider>
          </ModelPreferencesProvider>
        </BalanceProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
