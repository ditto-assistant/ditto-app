import { createContext, useContext, useEffect, useState } from "react"
import { useUserPreferences } from "@/hooks/useUser"
import { useUser } from "@/hooks/useUser"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ditto-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Get user preferences from API
  const { data: userData } = useUser()
  const { mutate: updatePreferences } = useUserPreferences()

  // Initialize theme from user preferences or localStorage fallback
  const [theme, setTheme] = useState<Theme>(
    () =>
      userData?.preferences?.theme ||
      (localStorage.getItem(storageKey) as Theme) ||
      defaultTheme
  )

  // Sync theme with user preferences when they load
  useEffect(() => {
    if (userData?.preferences?.theme && userData.preferences.theme !== theme) {
      setTheme(userData.preferences.theme)
    }
  }, [userData?.preferences?.theme])

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // Update local state
      setTheme(newTheme)

      // Persist to localStorage as fallback
      localStorage.setItem(storageKey, newTheme)

      // Update user preferences in the API
      if (userData) {
        updatePreferences({ theme: newTheme })
      }
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
