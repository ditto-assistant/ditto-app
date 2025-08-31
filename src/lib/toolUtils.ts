/**
 * Tool type detection utilities for chat messages
 */

/**
 * Detects the type of tool used to generate a message based on its content
 */
export function detectToolType(text?: string): string | null {
  if (!text) return null
  if (text.includes("Image Task:") || text.includes("<IMAGE_GENERATION>"))
    return "image"
  if (text.includes("Google Search Query:") || text.includes("<GOOGLE_SEARCH>"))
    return "search"
  if (
    text.includes("OpenSCAD Script Generated") ||
    text.includes("<OPENSCAD_SCRIPT>")
  )
    return "openscad"
  if (text.includes("HTML Script Generated") || text.includes("<HTML_SCRIPT>"))
    return "html"
  if (text.includes("Home Assistant Task:")) return "home"

  return null
}

/**
 * Tool label configuration mapping tool types to their display properties
 */
export const toolLabels: Record<string, { color: string; text: string }> = {
  openscad: { color: "#1E88E5", text: "OpenSCAD" },
  html: { color: "#FF9800", text: "HTML" },
  image: { color: "#4CAF50", text: "Image" },
  search: { color: "#9C27B0", text: "Search" },
  home: { color: "#F44336", text: "Home" },
}

/**
 * Get the display label for a tool type
 */
export function getToolLabel(
  toolType: string
): { color: string; text: string } | null {
  return toolLabels[toolType] || null
}

/**
 * Check if a tool type is valid/recognized
 */
export function isValidToolType(toolType: string): boolean {
  return toolType in toolLabels
}
