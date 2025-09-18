import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File size limits
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
export const MAX_FILE_SIZE_MB = 50

/**
 * Validates if a file size is within the allowed limit
 * @param file - The file to validate
 * @param showToast - Whether to show a toast notification on error (default: true)
 * @returns true if file size is valid, false otherwise
 */
export function validateFileSize(
  file: File,
  showToast: boolean = true
): boolean {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    if (showToast) {
      toast.error(
        `File "${file.name}" is too large. Maximum file size is ${MAX_FILE_SIZE_MB}MB.`
      )
    }
    return false
  }
  return true
}

/**
 * Filter callback version of validateFileSize for Array.filter()
 */
export const validateFileSizeCallback = (file: File): boolean =>
  validateFileSize(file)

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
