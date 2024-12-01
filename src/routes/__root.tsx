import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { FullScreenSpinner } from '@/components/LoadingSpinner'

export const Route = createRootRoute({
    component: RootComponent,
    pendingComponent: FullScreenSpinner,
})

function RootComponent() {
    return (
        <>
            <Outlet />
            <TanStackRouterDevtools position="bottom-right" />
        </>
    )
}
