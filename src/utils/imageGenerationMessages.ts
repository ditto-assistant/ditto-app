const IMAGE_GENERATION_MESSAGES = [
  "Generating image...",
  "Hang in there! Creating your image...",
  "Still working on your image...",
  "Almost there! Putting the finishing touches...",
  "Stay put, your image is taking shape...",
  "Creating something awesome for you...",
  "Just a bit more time, perfecting your image...",
  "Your image is worth the wait...",
  "Polishing the final details...",
  "Stay tuned, almost done!",
  "Making it just right for you...",
  "Getting the details perfect...",
  "Your masterpiece is coming together...",
  "Just a few more moments...",
  "Quality takes time - almost ready!",
] as const

class ImageGenerationMessageService {
  private currentIndex = 0
  private intervalId: NodeJS.Timeout | null = null
  private isActive = false

  getCurrentMessage(): string {
    return IMAGE_GENERATION_MESSAGES[this.currentIndex]
  }

  startRotation(onUpdate: (message: string) => void): void {
    this.isActive = true
    this.currentIndex = 0

    // Call immediately with first message
    onUpdate(this.getCurrentMessage())

    // Set up interval to rotate messages every 4 seconds
    this.intervalId = setInterval(() => {
      if (!this.isActive) return

      this.currentIndex =
        (this.currentIndex + 1) % IMAGE_GENERATION_MESSAGES.length
      onUpdate(this.getCurrentMessage())
    }, 4000)
  }

  stopRotation(): void {
    this.isActive = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  reset(): void {
    this.stopRotation()
    this.currentIndex = 0
  }
}

// Export a singleton instance
export const imageGenerationMessageService = new ImageGenerationMessageService()
