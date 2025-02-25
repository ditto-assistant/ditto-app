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
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import { AuthProvider } from "./hooks/useAuth";
import { BalanceProvider } from "./hooks/useBalance";
import { MemoryCountProvider } from "./hooks/useMemoryCount";
import { PresignedUrlProvider } from "./hooks/usePresignedUrls";
import { ModelPreferencesProvider } from "./hooks/useModelPreferences";
import { ImageViewerProvider } from "./hooks/useImageViewer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ModalProvider, ModalRegistry } from "./hooks/useModal";

const Login = lazy(() => import("./screens/login"));
const FeedbackModal = lazy(() => import("./components/FeedbackModal"));
const ImageViewer = lazy(() => import("./components/ImageViewer"));
const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const DittoCanvas = lazy(() => import("./screens/DittoCanvas"));
const Settings = lazy(() => import("./screens/settings"));
const Checkout = lazy(() => import("./screens/checkout"));
const CheckoutSuccess = lazy(() => import("./screens/checkoutSuccess"));
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
        <Route path="canvas" element={<DittoCanvas />} />
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
