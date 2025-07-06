/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, mock } from "bun:test"
import { openaiImageGeneration } from "./LLM"

// Mock the getToken function to avoid Firebase dependencies in tests
mock.module("./auth", () => ({
  getToken: mock(() =>
    Promise.resolve({
      ok: {
        userID: "test-user-id",
        token: "test-token",
      },
      err: null,
    })
  ),
}))

// Mock fetch to avoid actual API calls in tests
globalThis.fetch = mock() as unknown as typeof fetch

describe("openaiImageGeneration", () => {
  beforeEach(() => {
    mock.restore()
    globalThis.fetch = mock() as unknown as typeof fetch
  })

  describe("input validation", () => {
    it("should reject empty prompt", async () => {
      const result = await openaiImageGeneration("")
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe(
        "Prompt is required and must be a valid string"
      )
    })

    it("should reject whitespace-only prompt", async () => {
      const result = await openaiImageGeneration("   ")
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe("Prompt cannot be empty")
    })

    it("should reject non-string prompt", async () => {
      const result = await openaiImageGeneration(null as unknown as string)
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe(
        "Prompt is required and must be a valid string"
      )
    })

    it("should reject undefined prompt", async () => {
      const result = await openaiImageGeneration(undefined as unknown as string)
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe(
        "Prompt is required and must be a valid string"
      )
    })

    it("should reject prompt longer than 32000 characters", async () => {
      const longPrompt = "a".repeat(32001)
      const result = await openaiImageGeneration(longPrompt)
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe(
        "Prompt too long (max 32000 characters)"
      )
    })

    it("should accept prompt exactly at 32000 characters", async () => {
      const maxPrompt = "a".repeat(32000)

      // Mock successful fetch response
      ;(globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("https://example.com/image.jpg"),
      })

      const result = await openaiImageGeneration(maxPrompt)
      expect(result).not.toBeInstanceOf(Error)
      expect(typeof result).toBe("string")
    })

    it("should trim whitespace from prompt", async () => {
      const promptWithSpaces = "  valid prompt  "

      // Mock successful fetch response
      ;(globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("https://example.com/image.jpg"),
      })

      await openaiImageGeneration(promptWithSpaces)

      // Verify fetch was called with trimmed prompt
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"prompt":"valid prompt"'),
        })
      )
    })

    it("should accept valid prompt within limits", async () => {
      const validPrompt = "A beautiful sunset over mountains"

      // Mock successful fetch response
      ;(globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("https://example.com/image.jpg"),
      })

      const result = await openaiImageGeneration(validPrompt)
      expect(result).not.toBeInstanceOf(Error)
      expect(typeof result).toBe("string")
    })
  })

  describe("error handling", () => {
    it("should handle 402 payment required error", async () => {
      const validPrompt = "A beautiful sunset"

      // Mock 402 response
      ;(globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 402,
      })

      const result = await openaiImageGeneration(validPrompt)
      expect(result).toBeInstanceOf(Error)
      // The function returns ErrorPaymentRequired, which should be an Error instance
    })

    it("should handle other HTTP errors", async () => {
      const validPrompt = "A beautiful sunset"

      // Mock 500 response
      ;(globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      const result = await openaiImageGeneration(validPrompt)
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe("HTTP 500: Internal Server Error")
    })
  })
})
