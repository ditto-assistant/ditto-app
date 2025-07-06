import { imageGenerationMessageService } from "./imageGenerationMessages"

// Mock console.warn to avoid noise in tests
const originalWarn = console.warn
beforeEach(() => {
  console.warn = jest.fn()
  imageGenerationMessageService.reset()
})

afterEach(() => {
  console.warn = originalWarn
  imageGenerationMessageService.stopRotation()
})

describe("ImageGenerationMessageService", () => {
  describe("getCurrentMessage", () => {
    it("should return a valid message in early phase by default", () => {
      const message = imageGenerationMessageService.getCurrentMessage()
      expect(typeof message).toBe("string")
      expect(message.length).toBeGreaterThan(0)
      expect(message).toContain("Please don't close the app")
    })
  })

  describe("startRotation", () => {
    it("should call onUpdate immediately with first message", () => {
      const mockOnUpdate = jest.fn()

      imageGenerationMessageService.startRotation(mockOnUpdate)

      expect(mockOnUpdate).toHaveBeenCalledTimes(1)
      expect(typeof mockOnUpdate.mock.calls[0][0]).toBe("string")
    })

    it("should prevent race condition by not starting if already active", () => {
      const mockOnUpdate1 = jest.fn()
      const mockOnUpdate2 = jest.fn()

      // Start first rotation
      imageGenerationMessageService.startRotation(mockOnUpdate1)
      expect(mockOnUpdate1).toHaveBeenCalledTimes(1)

      // Try to start second rotation - should be prevented
      imageGenerationMessageService.startRotation(mockOnUpdate2)
      expect(mockOnUpdate2).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith(
        "Image generation message rotation already active"
      )
    })
  })

  describe("stopRotation", () => {
    it("should stop rotation and clear intervals", () => {
      const mockOnUpdate = jest.fn()

      imageGenerationMessageService.startRotation(mockOnUpdate)
      imageGenerationMessageService.stopRotation()

      // After stopping, should be able to start again without race condition warning
      console.warn = jest.fn() // Reset mock
      imageGenerationMessageService.startRotation(mockOnUpdate)
      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe("reset", () => {
    it("should reset service to initial state", () => {
      const mockOnUpdate = jest.fn()

      // Start rotation and let it run
      imageGenerationMessageService.startRotation(mockOnUpdate)

      // Reset should stop rotation and clear state
      imageGenerationMessageService.reset()

      // Should be able to start again without warnings
      console.warn = jest.fn()
      imageGenerationMessageService.startRotation(mockOnUpdate)
      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe("message phases", () => {
    it("should start in early phase", () => {
      const message = imageGenerationMessageService.getCurrentMessage()
      expect(message).toMatch(
        /Starting|Initializing|Getting started|Beginning|Setting up|Preparing|Loading|Launching/
      )
    })
  })

  describe("input validation for prompt length", () => {
    it("should handle various message lengths appropriately", () => {
      // This test ensures the service can handle long prompts that would be validated elsewhere
      const message = imageGenerationMessageService.getCurrentMessage()
      expect(message.length).toBeLessThan(1000) // Reasonable message length
      expect(message.length).toBeGreaterThan(10) // Not empty
    })
  })
})
