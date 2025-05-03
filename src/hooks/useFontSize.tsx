import { useState, useEffect, createContext, useContext } from "react"

type FontSize = "small" | "medium" | "large"

interface FontSizeContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(
  undefined
)

export const FontSizeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    // Initialize from localStorage if available
    return (localStorage.getItem("fontSizePreference") as FontSize) || "medium"
  })

  useEffect(() => {
    // Update localStorage and CSS variable when fontSize changes
    localStorage.setItem("fontSizePreference", fontSize)

    const fontSizeVar =
      fontSize === "small"
        ? "var(--font-size-small)"
        : fontSize === "large"
          ? "var(--font-size-large)"
          : "var(--font-size-medium)"

    document.documentElement.style.setProperty(
      "--font-size-default",
      fontSizeVar
    )

    // Force update across all elements
    document.body.setAttribute("data-font-size", fontSize)
  }, [fontSize])

  const value = { fontSize, setFontSize }
  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  )
}

export const useFontSize = () => {
  const context = useContext(FontSizeContext)
  if (context === undefined) {
    throw new Error("useFontSize must be used within a FontSizeProvider")
  }
  return context
}

export default useFontSize
