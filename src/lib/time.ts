/**
 * Generate user's local time with timezone offset in ISO format
 * Output example: "2024-01-15T10:30:45-05:00" (for EST)
 * Based on the comment in backend/pkg/api/v3/chat.go
 */
export function getUserLocalTime(): string {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60000 // Convert to milliseconds
  const localTime = new Date(now.getTime() - timezoneOffset)

  // Format the timezone offset
  const offsetHours = Math.abs(Math.floor(timezoneOffset / 3600000))
  const offsetMinutes = Math.abs(Math.floor((timezoneOffset % 3600000) / 60000))
  const offsetSign = timezoneOffset <= 0 ? "+" : "-"
  const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`

  // Combine date and offset
  const isoString = localTime.toISOString().slice(0, 19) + offsetString
  return isoString
}

/**
 * Validate content types for attachments
 */
export const SUPPORTED_CONTENT_TYPES = {
  IMAGE: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  DOCUMENT: ["application/pdf"],
  AUDIO: ["audio/wav", "audio/mp3", "audio/mpeg"],
} as const

export type SupportedContentType =
  | (typeof SUPPORTED_CONTENT_TYPES.IMAGE)[number]
  | (typeof SUPPORTED_CONTENT_TYPES.DOCUMENT)[number]
  | (typeof SUPPORTED_CONTENT_TYPES.AUDIO)[number]

/**
 * Check if a content type is supported
 */
export function isSupportedContentType(
  contentType: string
): contentType is SupportedContentType {
  return [
    ...SUPPORTED_CONTENT_TYPES.IMAGE,
    ...SUPPORTED_CONTENT_TYPES.DOCUMENT,
    ...SUPPORTED_CONTENT_TYPES.AUDIO,
  ].includes(contentType as SupportedContentType)
}

/**
 * Get the category of a content type
 */
export function getContentTypeCategory(
  contentType: SupportedContentType
): "image" | "document" | "audio" | null {
  switch (contentType) {
    case SUPPORTED_CONTENT_TYPES.IMAGE[0]:
      return "image"
    case SUPPORTED_CONTENT_TYPES.IMAGE[1]:
      return "image"
    case SUPPORTED_CONTENT_TYPES.IMAGE[2]:
      return "image"
    case SUPPORTED_CONTENT_TYPES.IMAGE[3]:
      return "image"
    case SUPPORTED_CONTENT_TYPES.DOCUMENT[0]:
      return "document"
    case SUPPORTED_CONTENT_TYPES.AUDIO[0]:
      return "audio"
    case SUPPORTED_CONTENT_TYPES.AUDIO[1]:
      return "audio"
    case SUPPORTED_CONTENT_TYPES.AUDIO[2]:
      return "audio"
    default:
      return null
  }
}

/**
 * Format timestamp for display in chat messages
 * Shows different formats based on how recent the timestamp is:
 * - Less than 24 hours: time only (HH:MM)
 * - Less than 7 days: weekday + time
 * - Older: month/day + time
 */
export function formatChatTimestamp(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const now = new Date()
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5

  if (diffInHours < 24) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  } else if (diffInHours < 168) {
    // 7 days
    return (
      date.toLocaleDateString([], { weekday: "short" }) +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    )
  } else {
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    )
  }
}
