import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./hooks/useAuth";
import { BalanceProvider } from "./hooks/useBalance";
import { DittoActivationProvider } from "./hooks/useDittoActivation";
import { IntentRecognitionProvider } from "./hooks/useIntentRecognition";
import { MemoryCountProvider } from "./hooks/useMemoryCount";
import { PresignedUrlProvider } from "./hooks/usePresignedUrls";
import { ModelPreferencesProvider } from "./hooks/useModelPreferences";

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
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
        </StrictMode>,
    )
}