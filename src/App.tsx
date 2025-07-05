import React, { Suspense, lazy } from "react"
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { createPortal } from "react-dom"
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner"
import AuthenticatedRoute from "@/hooks/AuthenticatedRoute"
import { AuthProvider } from "@/hooks/useAuth"
import { BalanceProvider } from "@/hooks/useBalance"
import { MemoryCountProvider } from "@/hooks/useMemoryCount"
import { ModelPreferencesProvider } from "@/hooks/useModelPreferences"
import { ImageViewerProvider } from "@/hooks/useImageViewer"
import { PlatformProvider, usePlatformContext } from "@/hooks/usePlatform"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ModalProvider, ModalRegistry } from "@/hooks/useModal"
import { ConfirmationDialogProvider } from "@/hooks/useConfirmationDialog"
import { MemoryNetworkProvider } from "@/hooks/useMemoryNetwork"
import { MemoryNodeViewerProvider } from "@/hooks/useMemoryNodeViewer"
import { ConversationProvider } from "./hooks/useConversationHistory"
import { PromptStorageProvider } from "@/hooks/usePromptStorage"
import { ComposeProvider } from "@/contexts/ComposeContext"
import { MemorySyncProvider } from "@/contexts/MemorySyncContext"
import { ServicesProvider } from "@/hooks/useServices"
import { initUpdateService } from "@/utils/updateService"
import useLazyLoadErrorHandler from "@/hooks/useLazyLoadErrorHandler"
import UpdateNotification from "@/components/UpdateNotification"
import WhatsNew from "@/components/WhatsNew/WhatsNew"
import Layout from "./components/ui/Layout"
import { ThemeProvider } from "@/components/theme-provider"
import { FontSizeProvider } from "@/hooks/useFontSize"
import { RouterErrorBoundary } from "@/components/RouterErrorBoundary"

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

const Login = loadE(() => import("@/screens/Login"))
const FeedbackModal = loadE(() => import("@/components/FeedbackModal"))
const ImageViewer = loadE(() => import("@/components/ImageViewer"))
const HomeScreen = loadE(() => import("@/screens/HomeScreen"))
const Settings = loadE(() => import("@/screens/Settings"))
const TokenModal = loadE(() => import("@/components/TokenModal"))
const MemoriesDashboardOverlay = loadE(
  () => import("@/screens/MemoriesDashboard/MemoriesDashboardOverlay")
)
const MemoryNetworkModal = loadE(() => import("@/components/MemoryNetwork"))
const MemoryNodeModal = loadE(() => import("@/components/MemoryNodeModal"))
const ComposeModal = loadE(() => import("@/components/ComposeModal"))
// const TestWhatsNew = loadE(() => import("@/components/WhatsNew/TestWhatsNew"))
const queryClient = new QueryClient()

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" errorElement={<RouterErrorBoundary />}>
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
        {/* <Route path="test">
          <Route path="whatsnew" Component={TestWhatsNew} />
        </Route> */}
      </Route>
    </Route>
  )
)

const modalRegistry: ModalRegistry = {
  feedback: {
    component: <FeedbackModal />,
  },
  imageViewer: {
    component: <ImageViewer />,
  },
  settings: {
    component: <Settings />,
  },
  memories: {
    component: <MemoriesDashboardOverlay />,
  },
  memoryNetwork: {
    component: <MemoryNetworkModal />,
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

// Component to handle dynamic toast offset based on PWA vs web
const ToasterWrapper = () => {
  const { isPWA } = usePlatformContext()
  
  // PWA needs more offset to account for different top bar behavior
  // Web uses 80px, PWA needs more space (120px for Android PWA)
  const offset = isPWA ? 120 : 80
  
  return createPortal(
    <Toaster
      position="top-center"
      closeButton
      richColors
      offset={offset}
    />,
    document.getElementById("toast-root")!
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BalanceProvider>
          <MemoryCountProvider>
            <ModelPreferencesProvider>
              <ImageViewerProvider>
                <PlatformProvider>
                  <MemoryNetworkProvider>
                    <ConfirmationDialogProvider>
                      <MemoryNodeViewerProvider>
                        <ConversationProvider>
                          <ServicesProvider>
                            <PromptStorageProvider>
                              <ComposeProvider>
                                <MemorySyncProvider>
                                  <ThemeProvider
                                    defaultTheme="system"
                                    storageKey="ditto-ui-theme"
                                  >
                                    <FontSizeProvider>
                                      <ComposeModal />
                                      <ModalProvider registry={modalRegistry}>
                                        <AppErrorBoundary>
                                          <RouterProvider router={router} />
                                        </AppErrorBoundary>
                                        <UpdateNotification />

                                        <ToasterWrapper />
                                        <ReactQueryDevtools
                                          buttonPosition="top-left"
                                          initialIsOpen={false}
                                        />
                                      </ModalProvider>
                                    </FontSizeProvider>
                                  </ThemeProvider>
                                </MemorySyncProvider>
                              </ComposeProvider>
                            </PromptStorageProvider>
                          </ServicesProvider>
                        </ConversationProvider>
                      </MemoryNodeViewerProvider>
                    </ConfirmationDialogProvider>
                  </MemoryNetworkProvider>
                </PlatformProvider>
              </ImageViewerProvider>
            </ModelPreferencesProvider>
          </MemoryCountProvider>
        </BalanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
