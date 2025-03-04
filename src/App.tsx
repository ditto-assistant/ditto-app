import { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
  Outlet,
} from "react-router";
import { Toaster } from "react-hot-toast";
import { createPortal } from "react-dom";
import FullScreenSpinner from "@/components/LoadingSpinner";
import AuthenticatedRoute from "@/hooks/AuthenticatedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { BalanceProvider } from "@/hooks/useBalance";
import { MemoryCountProvider } from "@/hooks/useMemoryCount";
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
import { ConversationProvider } from "./hooks/useConversationHistory";
import { ComposeProvider } from "@/components/ComposeModal";
import { PromptStorageProvider } from "@/hooks/usePromptStorage";

const DittoCanvasModal = lazy(() => import("@/components/DittoCanvasModal"));
const Login = lazy(() => import("@/screens/Login"));
const FeedbackModal = lazy(() => import("@/components/FeedbackModal"));
const ImageViewer = lazy(() => import("@/components/ImageViewer"));
const HomeScreen = lazy(() => import("@/screens/HomeScreen"));
const Settings = lazy(() => import("@/screens/Settings"));
const Checkout = lazy(() => import("@/screens/Checkout"));
const CheckoutSuccess = lazy(() => import("@/screens/CheckoutSuccess"));
const LLMTest = lazy(() => import("@/api/LLMTest"));
const ScriptsOverlay = lazy(
  () => import("@/screens/ScriptsModal/ScriptsOverlay")
);
const ConfirmationDialog = lazy(
  () => import("@/components/ui/modals/ConfirmationModal")
);
const MemoryNetworkModal = lazy(() => import("@/components/MemoryNetwork"));
const MemoryNodeModal = lazy(() => import("@/components/MemoryNodeModal"));
const ComposeModal = lazy(() => import("@/components/ComposeModal"));
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
        <Route path="llm-test" element={<LLMTest />} />
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
  memoryNodeViewer: {
    component: <MemoryNodeModal />,
  },
  // No need to register fullscreenCompose in the registry anymore
  // We'll handle it directly in SendMessage component
} as const;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BalanceProvider>
          <MemoryCountProvider>
            <ModelPreferencesProvider>
              <ImageViewerProvider>
                <ScriptsProvider>
                  <PlatformProvider>
                    <MemoryNetworkProvider>
                      <ConfirmationDialogProvider>
                        <MemoryNodeViewerProvider>
                          <ConversationProvider>
                            <ModalProvider registry={modalRegistry}>
                              <PromptStorageProvider>
                                <ComposeProvider>
                                  <RouterProvider router={router} />
                                  {createPortal(
                                    <Toaster
                                      position="bottom-center"
                                      toastOptions={{
                                        style: {
                                          background: "#333",
                                          color: "#fff",
                                          borderRadius: "8px",
                                          padding: "12px 16px",
                                          zIndex: 10000,
                                        },
                                      }}
                                    />,
                                    document.getElementById("toast-root") ||
                                      document.body
                                  )}
                                  {/* <ReactQueryDevtools
                                    buttonPosition="bottom-left"
                                    initialIsOpen={false}
                                  /> */}
                                </ComposeProvider>
                              </PromptStorageProvider>
                            </ModalProvider>
                          </ConversationProvider>
                        </MemoryNodeViewerProvider>
                      </ConfirmationDialogProvider>
                    </MemoryNetworkProvider>
                  </PlatformProvider>
                </ScriptsProvider>
              </ImageViewerProvider>
            </ModelPreferencesProvider>
          </MemoryCountProvider>
        </BalanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
