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
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner";
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
import { initUpdateService } from "@/utils/updateService";
import useLazyLoadErrorHandler from "@/hooks/useLazyLoadErrorHandler";
import UpdateNotification from "@/components/UpdateNotification";
import WhatsNew from "@/components/WhatsNew/WhatsNew";

// Initialize update service
initUpdateService();

// Create error boundary wrapper
const AppErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { ErrorBoundaryWrapper, isOutdated } = useLazyLoadErrorHandler();

  // If we detected an outdated version from a lazy loading error,
  // we don't render the children to prevent further errors
  if (isOutdated) {
    return <UpdateNotification />;
  }

  return <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>;
};

// Wrap lazy components with error boundary
const loadE = <T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      // This will be caught by the ErrorBoundary
      console.error("Failed to load component:", error);
      throw error;
    }
  });
};

const DittoCanvasModal = loadE(() => import("@/components/DittoCanvasModal"));
const Login = loadE(() => import("@/screens/Login"));
const FeedbackModal = loadE(() => import("@/components/FeedbackModal"));
const ImageViewer = loadE(() => import("@/components/ImageViewer"));
const HomeScreen = loadE(() => import("@/screens/HomeScreen"));
const Settings = loadE(() => import("@/screens/Settings"));
const Checkout = loadE(() => import("@/screens/Checkout"));
const CheckoutSuccess = loadE(() => import("@/screens/CheckoutSuccess"));
const ScriptsOverlay = loadE(
  () => import("@/screens/ScriptsModal/ScriptsOverlay"),
);
const ConfirmationDialog = loadE(
  () => import("@/components/ui/modals/ConfirmationModal"),
);
const MemoryNetworkModal = loadE(() => import("@/components/MemoryNetwork"));
const MemoryNodeModal = loadE(() => import("@/components/MemoryNodeModal"));
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
    </Route>,
  ),
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
  whatsNew: {
    component: <WhatsNew />,
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
                                  <AppErrorBoundary>
                                    <RouterProvider router={router} />
                                  </AppErrorBoundary>
                                  <UpdateNotification />

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
                                      document.body,
                                  )}
                                  <ReactQueryDevtools
                                    buttonPosition="top-right"
                                    initialIsOpen={false}
                                  />
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
