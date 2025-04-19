import { createContext, useContext, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { User } from "firebase/auth"
import { auth } from "../control/firebase"
import { preloadAvatar } from "./useUserAvatar"

type AuthContextType = ReturnType<typeof useAuthState> & {
  user: User | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Access the authentication state.
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

/**
 * Access the authentication token.
 */
export const useAuthToken = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["authToken", user],
    queryFn: async () => {
      if (!user) return undefined
      return user.getIdToken()
    },
    enabled: !!user
  })
}

function useAuthState() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: () => {
      return new Promise<User | null>((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(
          (user) => {
            unsubscribe()
            resolve(user)
          },
          (error) => {
            unsubscribe()
            reject(error)
          }
        )
      })
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const queryClient = useQueryClient()
  const query = useAuthState()

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      queryClient.setQueryData(["auth"], user)
      if (user?.photoURL) {
        preloadAvatar(user.photoURL)
      }
    })

    return () => unsubscribe()
  }, [queryClient])

  const signOut = async () => {
    await auth.signOut()
    queryClient.setQueryData(["auth"], null)
    queryClient.removeQueries({ queryKey: ["authToken"] })
  }

  return (
    <AuthContext.Provider
      value={{
        ...query,
        user: query.data ?? null,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
