import { useEffect } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "./useAuth"

type AuthenticatedRouteProps = {
  children: React.ReactNode
}

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && (!user || !user.emailVerified)) {
      navigate("/login")
    }
  }, [isLoading, user, navigate])

  return children
}
