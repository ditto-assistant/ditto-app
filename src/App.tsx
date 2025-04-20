import React, { Suspense, lazy } from "react"
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from "react-router"
import { Toaster } from "@/components/ui/sonner"
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner"
import AuthenticatedRoute from "@/hooks/AuthenticatedRoute"
import { AuthProvider } from "@/hooks/useAuth"
import { BalanceProvider } from "@/hooks/useBalance"
import { MemoryCountProvider } from "@/hooks/useMemoryCount"
import { ModelPreferencesProvider } from "@/hooks/useModelPreferences"
import { ImageViewerProvider } from "@/hooks/useImageViewer"
import { ScriptsProvider } from "@/hooks/useScripts"
import { PlatformProvider } from "@/hooks/usePlatform"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ModalProvider, ModalRegistry } from "@/hooks/useModal"
import { ConfirmationDialogProvider } from "@/hooks/useConfirmationDialog"
import { MemoryNetworkProvider } from "@/hooks/useMemoryNetwork"
import { MemoryNodeViewerProvider } from "@/hooks/useMemoryNodeViewer"
import { ConversationProvider } from "./hooks/useConversationHistory"
import { ComposeProvider } from "@/components/ComposeModal"
import { PromptStorageProvider } from "@/hooks/usePromptStorage"
import { ServicesProvider } from "@/hooks/useServices"
import { initUpdateService } from "@/utils/updateService"
import useLazyLoadErrorHandler from "@/hooks/useLazyLoadErrorHandler"
import UpdateNotification from "@/components/UpdateNotification"
import WhatsNew from "@/components/WhatsNew/WhatsNew"
import Layout from "./components/ui/Layout"

initUpdateService()

const AppErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const { ErrorBoundaryWrapper, isOutdated } = useLazyLoadErrorHandler()
  if (isOutdated) {
    return <UpdateNotification />
  }
  return <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
}

const loadE = <T extends React.ComponentType>(
  importFn: () => Promise<{ default: T }>
) => {
  return lazy(async () => {
    try {
      return await importFn()
    } catch (error) {
      console.error("Failed to load component:", error)
      throw error
    }
  })
}

const DittoCanvasModal = loadE(() => import("@/components/DittoCanvasModal"))
const Login = loadE(() => import("@/screens/Login"))
const FeedbackModal = loadE(() => import("@/components/FeedbackModal"))
const ImageViewer = loadE(() => import("@/components/ImageViewer"))
const HomeScreen = loadE(() => import("@/screens/HomeScreen"))
const Settings = loadE(() => import("@/screens/Settings"))
const TokenModal = loadE(() => import("@/components/TokenModal"))
const ScriptsOverlay = loadE(
  () => import("@/screens/ScriptsModal/ScriptsOverlay")
)
const ConfirmationDialog = loadE(
  () => import("@/components/ui/modals/ConfirmationModal")
)
const MemoryNetworkModal = loadE(() => import("@/components/MemoryNetwork"))
const MemoryNodeModal = loadE(() => import("@/components/MemoryNodeModal"))
const queryClient = new QueryClient()

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/">
      <Route element={<Layout className="login-layout" />}>
        <Route path="login" Component={Login} />
      </Route>

      <Route
        element={
          <Suspense fallback={<FullScreenSpinner />}>
            <AuthenticatedRoute>
              <Layout className="main-layout" />
            </AuthenticatedRoute>
          </Suspense>
        }
      >
        <Route index Component={HomeScreen} />
      </Route>
    </Route>
  )
)

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
    component: <ConfirmationDialog />,
  },
  memoryNodeViewer: {
    component: <MemoryNodeModal />,
  },
  whatsNew: {
    component: <WhatsNew />,
  },
  tokenCheckout: {
    component: <TokenModal />,
  },
} as const

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
                            <ServicesProvider>
                              <ModalProvider registry={modalRegistry}>
                                <PromptStorageProvider>
                                  <ComposeProvider>
                                    <AppErrorBoundary>
                                      <RouterProvider router={router} />
                                    </AppErrorBoundary>
                                    <UpdateNotification />

                                    <Toaster
                                      position="top-center"
                                      closeButton
                                      richColors
                                    />
                                    <ReactQueryDevtools
                                      buttonPosition="top-right"
                                      initialIsOpen={false}
                                    />
                                  </ComposeProvider>
                                </PromptStorageProvider>
                              </ModalProvider>
                            </ServicesProvider>
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
  )
}

export default App
