import { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
  Outlet,
} from "react-router";
import { Toaster } from "react-hot-toast";
import FullScreenSpinner from "@/components/LoadingSpinner";
import AuthenticatedRoute from "@/hooks/AuthenticatedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { BalanceProvider } from "@/hooks/useBalance";
import { MemoryCountProvider } from "@/hooks/useMemoryCount";
import { PresignedUrlProvider } from "@/hooks/usePresignedUrls";
import { ModelPreferencesProvider } from "@/hooks/useModelPreferences";
import { ImageViewerProvider } from "@/hooks/useImageViewer";
import { ScriptsProvider } from "@/hooks/useScripts";
import { PlatformProvider } from "@/hooks/usePlatform";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ModalProvider, ModalRegistry } from "@/hooks/useModal";
import { ConfirmationDialogProvider } from "@/hooks/useConfirmationDialog";
import { MemoryNetworkProvider } from "@/hooks/useMemoryNetwork";
import { MemoryNodeViewerProvider } from "@/hooks/useMemoryNodeViewer";

const DittoCanvasModal = lazy(() => import("@/components/DittoCanvasModal"));
const Login = lazy(() => import("@/screens/Login"));
const FeedbackModal = lazy(() => import("@/components/FeedbackModal"));
const ImageViewer = lazy(() => import("@/components/ImageViewer"));
const HomeScreen = lazy(() => import("@/screens/HomeScreen"));
const Settings = lazy(() => import("@/screens/Settings"));
const Checkout = lazy(() => import("@/screens/Checkout"));
const CheckoutSuccess = lazy(() => import("@/screens/CheckoutSuccess"));
const ScriptsOverlay = lazy(
  () => import("@/screens/ScriptsModal/ScriptsOverlay")
);
const ConfirmationDialog = lazy(
  () => import("@/components/ui/modals/ConfirmationModal")
);
const MemoryOverlay = lazy(() => import("@/components/MemoryOverlay"));
const MemoryNetworkModal = lazy(() => import("@/components/MemoryNetwork"));
const MemoryNodeModal = lazy(() => import("@/components/MemoryNodeModal"));
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
    component: <MemoryNetworkModal />,
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
  confirmationDialog: {
    component: <ConfirmationDialog id="confirmationDialog" />,
  },
  memorySettings: {
    component: <MemoryOverlay />,
  },
  memoryNodeViewer: {
    component: <MemoryNodeModal />,
  },
} as const;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BalanceProvider>
          <MemoryCountProvider>
            <PresignedUrlProvider>
              <ModelPreferencesProvider>
                <ImageViewerProvider>
                  <ScriptsProvider>
                    <PlatformProvider>
                      <MemoryNetworkProvider>
                        <ConfirmationDialogProvider>
                          <MemoryNodeViewerProvider>
                            <ModalProvider registry={modalRegistry}>
                              <RouterProvider router={router} />
                              <Toaster
                                position="bottom-center"
                                toastOptions={{
                                  style: {
                                    background: "#333",
                                    color: "#fff",
                                    borderRadius: "8px",
                                    padding: "12px 16px",
                                  },
                                }}
                              />
                              <ReactQueryDevtools
                                buttonPosition="bottom-left"
                                initialIsOpen={false}
                              />
                            </ModalProvider>
                          </MemoryNodeViewerProvider>
                        </ConfirmationDialogProvider>
                      </MemoryNetworkProvider>
                    </PlatformProvider>
                  </ScriptsProvider>
                </ImageViewerProvider>
              </ModelPreferencesProvider>
            </PresignedUrlProvider>
          </MemoryCountProvider>
        </BalanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
