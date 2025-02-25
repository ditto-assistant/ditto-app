import { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
  Outlet,
} from "react-router";
import { Toaster } from "react-hot-toast";
import FullScreenSpinner from "./components/LoadingSpinner";
import AuthenticatedRoute from "./hooks/AuthenticatedRoute";
import { AuthProvider } from "./hooks/useAuth";
import { BalanceProvider } from "./hooks/useBalance";
import { MemoryCountProvider } from "./hooks/useMemoryCount";
import { PresignedUrlProvider } from "./hooks/usePresignedUrls";
import { ModelPreferencesProvider } from "./hooks/useModelPreferences";
import { ImageViewerProvider } from "./hooks/useImageViewer";
import { ScriptsProvider } from "./hooks/useScripts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ModalProvider, ModalRegistry } from "./hooks/useModal";

const Login = lazy(() => import("./screens/Login"));
const FeedbackModal = lazy(() => import("./components/FeedbackModal"));
const ImageViewer = lazy(() => import("./components/ImageViewer"));
const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const Settings = lazy(() => import("./screens/Settings"));
const Checkout = lazy(() => import("./screens/Checkout"));
const CheckoutSuccess = lazy(() => import("./screens/CheckoutSuccess"));
const ScriptsOverlay = lazy(
  () => import("./screens/ScriptsModal/ScriptsOverlay")
);
const DittoCanvasModal = lazy(() => import("./components/DittoCanvasModal"));
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
        <Route path="checkout">
          <Route index element={<Checkout />} />
          <Route path="success" element={<CheckoutSuccess />} />
        </Route>
      </Route>
    </Route>
  )
);

const modalRegistry: ModalRegistry = {
  feedback: {
    component: <FeedbackModal />,
  },
  memoryNetwork: {
    component: <div>Memory Network Modal</div>,
  },
  imageViewer: {
    component: <ImageViewer />,
  },
  settings: {
    component: <Settings />,
  },
  scripts: {
    component: <ScriptsOverlay />,
  },
  dittoCanvas: {
    component: <DittoCanvasModal />,
  },
} as const;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BalanceProvider>
          <ModelPreferencesProvider>
            <MemoryCountProvider>
              <PresignedUrlProvider>
                <ImageViewerProvider>
                  <ScriptsProvider>
                    <ModalProvider registry={modalRegistry}>
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
                    </ModalProvider>
                  </ScriptsProvider>
                </ImageViewerProvider>
              </PresignedUrlProvider>
            </MemoryCountProvider>
          </ModelPreferencesProvider>
        </BalanceProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
